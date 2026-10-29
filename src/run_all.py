"""Run the pipeline in priority order. Usage: python src/run_all.py [check p0 p1 p2 p3 p4] [--dataset gossipcop]"""
import argparse
import os
import os.path as osp
import random
import time

import pandas as pd
import torch

from data import AGE, FOLLOWERS, STATUSES, load, prof_col, user_x
from train import RESULTS, metrics, predict, train

ARCHS, SEEDS, PS = ['GCN', 'GAT', 'SAGE'], [0, 1, 2], [0, 0.05, 0.10, 0.20]

ap = argparse.ArgumentParser()
ap.add_argument('stages', nargs='*', default=['check', 'p0', 'p1', 'p2', 'p3', 'p4'])
ap.add_argument('--dataset', default='politifact')
ap.add_argument('--arch', default=None, help='p1g only: run one architecture (to parallelise)')
args = ap.parse_args()
DS = args.dataset
os.makedirs(RESULTS, exist_ok=True)
out = lambda f: osp.join(RESULTS, f if DS == 'politifact' else f'{DS}_{f}')


def splits(feature):
    return [load(DS, feature, s) for s in ('train', 'val', 'test')]


def mean_std(df, keys, cols):
    g = df.groupby(keys, sort=False)[cols]
    m, s = g.mean(), g.std().fillna(0)
    return pd.DataFrame({c: [f'{a:.3f} ± {b:.3f}' for a, b in zip(m[c], s[c])] for c in cols}, index=m.index).reset_index()


def check():
    tr, va, te = splits('content')
    print(f'{DS}: train {len(tr)} (fake {sum(int(g.y) for g in tr)}), val {len(va)} (fake {sum(int(g.y) for g in va)}), '
          f'test {len(te)} (fake {sum(int(g.y) for g in te)})')
    g = tr[0]
    print(f'example graph: nodes {g.num_nodes}, edges {g.num_edges}, x {tuple(g.x.shape)}, label {int(g.y)} (1=fake)')
    ptr = load(DS, 'profile', 'train')
    assert all(a.num_nodes == b.num_nodes for a, b in zip(tr, ptr))
    u, pu = user_x(tr), user_x(ptr)
    exact = torch.isclose(u[:, 300:], pu, atol=1e-5).all(1).float().mean()
    print(f'content[:,300:310] == profile[:,0:10] exactly on {exact:.1%} of train user rows')
    for c, n in [(FOLLOWERS, 'followers'), (STATUSES, 'statuses'), (AGE, 'account_age')]:
        q = torch.quantile(u[:, prof_col('content', c)], torch.tensor([0, .05, .5, .95, 1.]))
        print(f'  {n:12s} min/p5/p50/p95/max = {[round(v, 5) for v in q.tolist()]}')


def p0():
    rows = []
    for feature in ['content', 'bert']:
        tr, va, te = splits(feature)
        for arch in ARCHS:
            for seed in SEEDS:
                m = train(arch, tr, va, seed, f'{DS}_{feature}_{arch}_s{seed}')
                y, p, _ = predict(m, te)
                rows.append(dict(feature=feature, model=arch, seed=seed, **metrics(y, p)))
    df = pd.DataFrame(rows)
    df.to_csv(out('baseline_per_seed.csv'), index=False)
    agg = mean_std(df, ['feature', 'model'], ['acc', 'precision', 'recall', 'f1'])
    agg.to_csv(out('baseline.csv'), index=False)
    print(agg.to_string(index=False))


COLORS = {'GCN': '#2a78d6', 'GAT': '#eb6834', 'SAGE': '#1baf7a'}
MARKERS = {'GCN': 'o', 'GAT': 's', 'SAGE': '^'}
BOT_TYPES = ['naive', 'camo']


def base_models(tr, va):
    return {(a, s): train(a, tr, va, s, f'{DS}_content_{a}_s{s}') for a in ARCHS for s in SEEDS}


def attack_rows(net, te, bots, seed, types, ps=PS, filt=None, **extra):
    """Evaluate one model on attacked test sets. filt: optional per-graph defense applied before the model."""
    from attack import attack_set
    prep = (lambda gs: [filt(g) for g in gs]) if filt else (lambda gs: gs)
    y, clean_pred, _ = predict(net, prep(attack_set(te, 0, 'naive', bots, seed)))
    caught = (y == 1) & (clean_pred == 1)
    rows = []
    for bt in types:
        for p in ps:
            att = attack_set(te, p, bt, bots, seed, model=net)
            y, pred, _ = predict(net, prep(att))
            asr = float(((pred == 0) & caught).sum() / max(caught.sum(), 1))
            rows.append(dict(**extra, seed=seed, bot_type=bt, p=p, **metrics(y, pred), asr=asr))
    return rows


def p1():
    import matplotlib.pyplot as plt
    from attack import Bots
    tr, va, te = splits('content')
    bots = Bots(tr)
    rows = []
    for (a, s), m in base_models(tr, va).items():
        rows += attack_rows(m, te, bots, s, BOT_TYPES, model=a)
    df = pd.DataFrame(rows)
    df.to_csv(out('attack_per_seed.csv'), index=False)
    agg = mean_std(df, ['model', 'bot_type', 'p'], ['acc', 'f1', 'asr'])
    agg.to_csv(out('attack.csv'), index=False)
    print(agg.to_string(index=False))
    plot_attack()


def greedy_df():
    fs = [out(f'greedy_{a}.csv') for a in ARCHS if osp.exists(out(f'greedy_{a}.csv'))]
    return pd.concat([pd.read_csv(f) for f in fs]) if fs else None


def plot_attack():
    """Line chart from attack_per_seed.csv (+ greedy_*.csv if the optional greedy attack has run)."""
    import matplotlib.pyplot as plt
    df, gr = pd.read_csv(out('attack_per_seed.csv')), greedy_df()
    fig, ax = plt.subplots(figsize=(7, 4.6))
    mean = df.groupby(['model', 'bot_type', 'p'])['acc'].mean()
    for a in ARCHS:
        for bt, ls in [('naive', '-'), ('camo', '--')]:
            v = mean[a, bt]
            ax.plot(v.index * 100, v.values, ls, color=COLORS[a], marker=MARKERS[a], ms=7, lw=2,
                    label=f'{a} – {"naive" if bt == "naive" else "camouflaged"} bots')
        if gr is not None and a in set(gr.model):
            v = gr[(gr.model == a) & (gr.defense == 'none')].set_index('p')['acc']
            clean = df[(df.model == a) & (df.seed == 0) & (df.p == 0)]['acc'].iloc[0]
            ax.plot([0] + list(v.index * 100), [clean] + list(v.values), ':', color=COLORS[a], marker=MARKERS[a],
                    ms=7, lw=2, mfc='white', label=f'{a} – greedy bots (seed 0)')
    ax.set(xlabel='Bots injected into each fake-news graph (% of graph nodes)', ylabel='Test accuracy (mean of 3 seeds; axis starts at chance)',
           title=f'Bot injection attack on {DS.capitalize()} (content features)', xticks=[0, 5, 10, 20], ylim=(0.5, 1.0))
    ax.grid(alpha=.3); ax.spines[['top', 'right']].set_visible(False); ax.legend(fontsize=7, frameon=False, ncol=3, loc='lower left')
    fig.tight_layout(); fig.savefig(out('attack_curve.png'), dpi=150); plt.close(fig)


def adv_models(tr, va, bots):
    from defense import adv_augment
    ms = {}
    for a in ARCHS:
        for s in SEEDS:
            rng, gen = random.Random(1000 + s), torch.Generator().manual_seed(1000 + s)
            ms[a, s] = train(a, tr, va, s, f'{DS}_content_{a}_s{s}_adv', augment=lambda g: adv_augment(g, bots, rng, gen))
    return ms


CONDS = ['clean', 'attack', 'attack+filter', 'attack+adv', 'attack+both']


def p2():
    import matplotlib.pyplot as plt
    import numpy as np
    from attack import Bots, attack_set
    from defense import BotFilter
    tr, va, te = splits('content')
    bots, filt = Bots(tr), BotFilter(tr)
    # filter diagnostics: genuine users removed from clean graphs, injected bots removed from attacked graphs
    diag = []
    for name, gs in [('train', tr), ('test', te)]:
        u = user_x(gs)
        diag.append(dict(metric=f'false removal rate ({name} genuine users)', value=float(filt.flag(torch.cat([u[:1] * 0, u]))[1:].float().mean())))
    for bt in BOT_TYPES:
        for p in PS[1:]:
            att = attack_set(te, p, bt, bots, 0)
            caught = sum(int((filt.flag(g.x) & g.is_bot).sum()) for g in att)
            diag.append(dict(metric=f'bots removed ({bt}, p={p})', value=caught / sum(int(g.is_bot.sum()) for g in att)))
    pd.DataFrame(diag).to_csv(out('filter_diagnostics.csv'), index=False)
    print(pd.DataFrame(diag).to_string(index=False))
    print(f'filter thresholds: age >= {filt.age_thr:.4f}, followers <= {filt.fol_thr:.6f}, statuses <= {filt.st_thr:.6f}')

    base, adv = base_models(tr, va), adv_models(tr, va, bots)
    rows = []
    for (a, s) in base:
        for defense, m, f in [('none', base[a, s], None), ('filter', base[a, s], filt),
                              ('adv', adv[a, s], None), ('both', adv[a, s], filt)]:
            rows += attack_rows(m, te, bots, s, BOT_TYPES, filt=f, model=a, defense=defense)
    df = pd.DataFrame(rows)
    df.to_csv(out('defense_per_seed.csv'), index=False)
    agg = mean_std(df, ['model', 'defense', 'bot_type', 'p'], ['acc', 'f1', 'asr'])
    agg.to_csv(out('defense.csv'), index=False)
    print(agg[agg.p.isin([0, 0.1, 0.2])].to_string(index=False))

    mean = df.groupby(['model', 'defense', 'bot_type', 'p'])['acc'].agg(['mean', 'std'])
    best = df[(df.defense == 'none') & (df.p == 0)].groupby('model')['acc'].mean().idxmax()
    for arch in ARCHS:
        fig, axes = plt.subplots(1, 2, figsize=(10, 4), sharey=True)
        for ax, p in zip(axes, [0.10, 0.20]):
            x = np.arange(len(CONDS))
            for j, (bt, c) in enumerate([('naive', '#2a78d6'), ('camo', '#eb6834')]):
                key = [('none', 0), ('none', p), ('filter', p), ('adv', p), ('both', p)]
                v = [mean.loc[(arch, d, bt, pp)] for d, pp in key]
                ax.bar(x + (j - .5) * .38, [r['mean'] for r in v], .36, yerr=[r['std'] for r in v], color=c, capsize=3,
                       edgecolor='white', linewidth=2, label='naive bots' if bt == 'naive' else 'camouflaged bots')
                for xi, r in zip(x, v):
                    ax.text(xi + (j - .5) * .38, 0.505, f"{r['mean']:.2f}", ha='center', va='bottom', fontsize=7, color='white')
            ax.set(xticks=x, title=f'{int(p * 100)}% bots per fake graph', ylim=(0.5, 1.0))
            ax.set_xticklabels(CONDS, fontsize=8, rotation=15)
            ax.spines[['top', 'right']].set_visible(False); ax.grid(axis='y', alpha=.3)
        axes[0].set_ylabel('Test accuracy (mean ± std, 3 seeds)'); axes[0].legend(frameon=False, fontsize=8)
        fig.suptitle(f'{arch} on {DS.capitalize()}: attack vs defenses' + (' (best clean model)' if arch == best else ''))
        fig.tight_layout()
        fig.savefig(out('defense_bars.png' if arch == best else f'defense_bars_{arch}.png'), dpi=150); plt.close(fig)
    print('best clean model:', best)


def p1g(seed=0):
    """Optional greedy black-box attack (seed 0 only, to stay within the time budget).
    Adaptive: bots are chosen by querying the model under attack (normal or adv-trained)."""
    from attack import Bots, attack_set
    from defense import BotFilter
    tr, va, te = splits('content')
    bots, filt = Bots(tr), BotFilter(tr)
    adv = adv_models(tr, va, bots)
    for a in [args.arch] if args.arch else ARCHS:
        base, rows = train(a, tr, va, seed, f'{DS}_content_{a}_s{seed}'), []
        for defense, m, ps in [('none', base, [0.05, 0.10, 0.20]), ('adv', adv[a, seed], [0.10, 0.20])]:
            y, clean_pred, _ = predict(m, te)
            caught = (y == 1) & (clean_pred == 1)
            for p in ps:
                att = attack_set(te, p, 'greedy', bots, seed, model=m)
                removed = sum(int((filt.flag(g.x) & g.is_bot).sum()) for g in att) / sum(int(g.is_bot.sum()) for g in att)
                for d, gs in [(defense, att), ('filter' if defense == 'none' else 'both', [filt(g) for g in att])]:
                    _, pred, _ = predict(m, gs)
                    asr = float(((pred == 0) & caught).sum() / caught.sum())
                    rows.append(dict(model=a, defense=d, seed=seed, bot_type='greedy', p=p, **metrics(y, pred), asr=asr,
                                     bots_removed_by_filter=removed))
                print(a, defense, p, rows[-2]['acc'], flush=True)
        pd.DataFrame(rows).to_csv(out(f'greedy_{a}.csv'), index=False)


def p1t(seed=0):
    """Non-adaptive comparison for p1g: greedy bots crafted against the NORMAL model, then fed to the adv-trained
    model (transfer). p1g's adv rows are adaptive (bots crafted against the adv-trained model itself)."""
    from attack import Bots, attack_set
    from defense import BotFilter
    tr, va, te = splits('content')
    bots, filt = Bots(tr), BotFilter(tr)
    adv, rows = adv_models(tr, va, bots), []
    for a in [args.arch] if args.arch else ARCHS:
        base, m = train(a, tr, va, seed, f'{DS}_content_{a}_s{seed}'), adv[a, seed]
        y, clean_pred, _ = predict(m, te)
        caught = (y == 1) & (clean_pred == 1)
        for p in [0.10, 0.20]:
            att = attack_set(te, p, 'greedy', bots, seed, model=base)
            for d, gs in [('adv', att), ('both', [filt(g) for g in att])]:
                _, pred, _ = predict(m, gs)
                rows.append(dict(model=a, defense=d, seed=seed, bot_type='greedy', p=p, **metrics(y, pred),
                                 asr=float(((pred == 0) & caught).sum() / caught.sum())))
            print(a, 'transfer', p, rows[-2]['acc'], flush=True)
    pd.DataFrame(rows).to_csv(out('greedy_transfer.csv'), index=False)


def p3(arch='GCN', seed=0, bt='camo', p=0.20, n_agg=30):
    import matplotlib.pyplot as plt
    from attack import Bots, attack_set
    from explain import draw, explain, top10_bot_share
    tr, va, te = splits('content')
    bots = Bots(tr)
    base = train(arch, tr, va, seed, f'{DS}_content_{arch}_s{seed}')
    adv = adv_models(tr, va, bots)[arch, seed]
    att = attack_set(te, p, bt, bots, seed)
    fake = [i for i, g in enumerate(te) if int(g.y) == 1]
    _, pc, _ = predict(base, te); _, pa, _ = predict(base, att)
    # figures: prefer small fake graphs the attack flipped, then other small fake graphs
    small = [i for i in fake if te[i].num_nodes <= 120]
    pick = ([i for i in small if pc[i] == 1 and pa[i] == 0] + [i for i in small if not (pc[i] == 1 and pa[i] == 0)])[:3]
    lab = lambda m, g: 'REAL' if int(m(g.x, g.edge_index, torch.zeros(g.num_nodes, dtype=torch.long)).argmax()) == 0 else 'FAKE'
    for i in pick:
        fig, axes = plt.subplots(1, 3, figsize=(14, 4.8))
        pos = None
        for ax, (name, m, g) in zip(axes[::-1], [('(c) attacked, adv-trained model', adv, att[i]),
                                                 ('(b) attacked, normal model', base, att[i]),
                                                 ('(a) clean, normal model', base, te[i])]):
            nm, em = explain(m, g)
            share = top10_bot_share(nm, g.is_bot) if 'is_bot' in g else 0.0
            pos = draw(ax, g, nm, em, f'{name}\npred={lab(m, g)} (true FAKE) | bots in top-10 nodes: {share:.0%}', pos)
        fig.suptitle(f'GNNExplainer, {arch}, test graph {i}: {te[i].num_nodes} users+root, '
                     f'{int(att[i].is_bot.sum())} {bt} bots added (red outline). Darker = more important; big node = news root.',
                     fontsize=9)
        fig.tight_layout(); fig.savefig(out(f'explain_graph{i}.png'), dpi=130); plt.close(fig)
        print('saved', out(f'explain_graph{i}.png'))
    rows = []
    for i in fake[:n_agg]:
        g = att[i]
        nb = g.edge_index[1][g.edge_index[0] == 0].unique()  # bots all sit next to the root: fair chance level
        for name, m in [('normal', base), ('adv-trained', adv)]:
            rows.append(dict(graph=i, model=name, bot_fraction=float(g.is_bot.float().mean()),
                             bot_fraction_root_neighbours=float(g.is_bot[nb].float().mean()),
                             top10_bot_share=top10_bot_share(explain(m, g)[0], g.is_bot)))
    df = pd.DataFrame(rows)
    df.to_csv(out('explain_top10_bots_per_graph.csv'), index=False)
    agg = df.groupby('model', sort=False)[['bot_fraction', 'bot_fraction_root_neighbours', 'top10_bot_share']].agg(['mean', 'std']).round(3)
    agg.to_csv(out('explain_top10_bots.csv'))
    print(f'{arch} s{seed}, {bt} bots p={p}, first {n_agg} fake test graphs:\n{agg}')


def plot_greedy_defense(p=0.20, seed=0):
    """Bars per model: clean / greedy attack / + filter / + adv training / + both (seed 0, the only greedy run)."""
    import matplotlib.pyplot as plt
    import numpy as np
    gr = greedy_df()
    if gr is None:
        return
    d = pd.read_csv(out('defense_per_seed.csv'))
    clean = d[(d.seed == seed) & (d.p == 0) & (d.defense == 'none') & (d.bot_type == 'naive')].set_index('model')['acc']
    g = gr[gr.p == p].set_index(['model', 'defense'])['acc']
    conds = [('clean', None), ('attack', 'none'), ('attack+filter', 'filter'), ('attack+adv (adaptive)', 'adv'),
             ('attack+both (adaptive)', 'both')]
    cols = ['#52514e', '#e34948', '#eda100', '#2a78d6', '#1baf7a']
    if osp.exists(out('greedy_transfer.csv')):
        t = pd.read_csv(out('greedy_transfer.csv'))
        g = pd.concat([g, t[(t.p == p) & (t.defense == 'adv')].assign(defense='adv_transfer').set_index(['model', 'defense'])['acc']])
        conds.append(('attack+adv (transfer)', 'adv_transfer')); cols.append('#6250d6')
    archs = [a for a in ARCHS if a in clean.index and all(k is None or (a, k) in g.index for _, k in conds)]
    fig, ax = plt.subplots(figsize=(9, 4.4))
    x = np.arange(len(archs))
    w = 0.8 / len(conds)
    for j, ((name, key), c) in enumerate(zip(conds, cols)):
        v = [clean[a] if key is None else g[a, key] for a in archs]
        xs = x + (j - (len(conds) - 1) / 2) * w
        ax.bar(xs, v, w * 0.95, color=c, edgecolor='white', linewidth=2, label=name)
        for xi, vi in zip(xs, v):
            ax.text(xi, vi + 0.005, f'{vi:.2f}', ha='center', fontsize=7, color='#0b0b0b')
    ax.set(xticks=x, ylim=(0.5, 1.0), ylabel='Test accuracy (seed 0)',
           title=f'Greedy black-box bots ({int(p * 100)}% per fake graph) on {DS.capitalize()}: defenses')
    ax.set_xticklabels(archs)
    ax.legend(frameon=False, fontsize=7.5, ncol=3, loc='upper center')
    ax.spines[['top', 'right']].set_visible(False); ax.grid(axis='y', alpha=.3)
    fig.tight_layout(); fig.savefig(out('defense_bars_greedy.png'), dpi=150); plt.close(fig)


def p4():
    """Collect all CSVs into results_summary.md + robustness_report.csv. Findings text lives in results/findings.md."""
    plot_attack()
    plot_greedy_defense()
    md = lambda d: d.to_markdown(index=False)
    fmt = lambda m, s: f'{m:.3f} ± {s:.3f}'
    s = [f'# Results summary ({DS.capitalize()}, all numbers produced by src/run_all.py)\n']
    s += ['## 1. Baseline detectors (test set, 3 seeds, mean ± std, macro P/R/F1)\n', md(pd.read_csv(out('baseline.csv')))]

    d = pd.read_csv(out('defense_per_seed.csv'))
    gr = greedy_df()
    tr_ = pd.read_csv(out('greedy_transfer.csv')) if osp.exists(out('greedy_transfer.csv')) else None
    agg = d.groupby(['model', 'defense', 'bot_type', 'p'])[['acc', 'f1', 'asr']].agg(['mean', 'std'])
    cell = lambda k, c: fmt(agg.loc[k, (c, 'mean')], agg.loc[k, (c, 'std')])
    rows = []
    for a in ARCHS:
        rows.append(dict(model=a, condition='normal (clean test)', bot_type='-', p=0, acc=cell((a, 'none', 'naive', 0), 'acc'),
                         f1=cell((a, 'none', 'naive', 0), 'f1'), asr='-', seeds=3))
        for dname, lab in [('filter', 'clean + bot filter'), ('adv', 'clean + adv training'), ('both', 'clean + filter + adv')]:
            rows.append(dict(model=a, condition=lab, bot_type='-', p=0, acc=cell((a, dname, 'naive', 0), 'acc'),
                             f1=cell((a, dname, 'naive', 0), 'f1'), asr='-', seeds=3))
        for bt in BOT_TYPES:
            for p in [0.10, 0.20]:
                for dname, lab in [('none', 'attack'), ('filter', 'attack + bot filter'), ('adv', 'attack + adv training'),
                                   ('both', 'attack + filter + adv')]:
                    k = (a, dname, bt, p)
                    rows.append(dict(model=a, condition=lab, bot_type=bt, p=p, acc=cell(k, 'acc'), f1=cell(k, 'f1'),
                                     asr=cell(k, 'asr'), seeds=3))
        if gr is not None:  # p1g: bots crafted against the model being evaluated, so adv rows are adaptive
            for r in gr[gr.model == a].itertuples():
                lab = {'none': 'attack', 'filter': 'attack + bot filter', 'adv': 'attack + adv training (adaptive)',
                       'both': 'attack + filter + adv (adaptive)'}[r.defense]
                rows.append(dict(model=a, condition=lab, bot_type='greedy', p=r.p, acc=f'{r.acc:.3f}', f1=f'{r.f1:.3f}',
                                 asr=f'{r.asr:.3f}', seeds=1))
        if tr_ is not None:  # p1t: bots crafted against the normal model, evaluated on the adv-trained model
            for r in tr_[tr_.model == a].itertuples():
                lab = {'adv': 'attack + adv training (transfer)', 'both': 'attack + filter + adv (transfer)'}[r.defense]
                rows.append(dict(model=a, condition=lab, bot_type='greedy', p=r.p, acc=f'{r.acc:.3f}', f1=f'{r.f1:.3f}',
                                 asr=f'{r.asr:.3f}', seeds=1))
    rep = pd.DataFrame(rows)
    rep.to_csv(out('robustness_report.csv'), index=False)

    att = pd.read_csv(out('attack.csv'))
    att['bot_type'] = att.bot_type.map({'naive': 'naive', 'camo': 'camouflaged'})
    s += ['\n## 2. Bot injection attack: test accuracy vs bot budget p (only FAKE test graphs attacked; 3 seeds)\n',
          md(att.pivot_table(index=['model', 'bot_type'], columns='p', values='acc', aggfunc='first', sort=False).reset_index()),
          '\nAttack success rate (share of fake graphs caught before the attack and called REAL after it):\n',
          md(att.pivot_table(index=['model', 'bot_type'], columns='p', values='asr', aggfunc='first', sort=False).reset_index())]
    if gr is not None:
        g0 = gr[gr.defense == 'none'][['model', 'p', 'acc', 'f1', 'asr', 'bots_removed_by_filter']].round(3)
        s += ['\nGreedy black-box bots (optional, **seed 0 only**, 30 candidates per bot slot):\n', md(g0)]

    s += ['\n## 3. Defenses: accuracy at p = 0.10 and 0.20 (naive / camouflaged bots, 3 seeds, mean ± std)\n']
    for p in [0.10, 0.20]:
        t = rep[(rep.p == p) & (rep.bot_type != 'greedy')]
        t = t.pivot_table(index=['model', 'bot_type'], columns='condition', values='acc', aggfunc='first', sort=False)
        t = t.reindex(columns=['attack', 'attack + bot filter', 'attack + adv training', 'attack + filter + adv']).dropna(how='all')
        s += [f'\n**p = {p}**\n', md(t.reset_index())]
    if gr is not None:
        t = rep[rep.bot_type == 'greedy'].pivot_table(index=['model', 'p'], columns='condition', values='acc',
                                                       aggfunc='first', sort=False)
        s += ['\n**Greedy black-box bots (seed 0 only).** *Adaptive* = greedy bots re-crafted by querying the '
              'adversarially trained model itself (the attacker knows the defended model). *Transfer* = the bots '
              'crafted against the normal model, fed unchanged to the adversarially trained model. The 0.62 → 0.71 '
              'GCN result quoted in the findings is the adaptive one. – = not run.\n',
              md(t.reset_index().astype(object).fillna('–'))]
    sd = d[(d.p == 0) & (d.bot_type == 'naive') & (d.seed == 0)].set_index(['model', 'defense'])['acc']
    s += ['\nClean accuracy with each defense switched on (cost of the defense when there is no attack). '
          '**All values are 3-seed means ± std** (seeds 0, 1, 2). Seed 0 alone, which is the model used for the '
          'greedy attack and the explanations: ' +
          ', '.join(f'{a} normal {sd[a, "none"]:.3f} / adv-trained {sd[a, "adv"]:.3f}' for a in ARCHS) + '.\n',
          md(rep[rep.p == 0][['model', 'condition', 'acc', 'f1']])]
    s += ['\nBot filter diagnostics (thresholds learned on clean training users only):\n',
          md(pd.read_csv(out('filter_diagnostics.csv')).round(4))]
    if osp.exists(out('explain_top10_bots.csv')):
        e = pd.read_csv(out('explain_top10_bots.csv'), header=[0, 1], index_col=0).round(3)
        e.columns = [f'{a} ({b})' for a, b in e.columns]
        s += ['\n## 4. Explainability: share of bots among the 10 most important nodes (GNNExplainer, GCN seed 0, '
              'camouflaged bots p = 0.20, first 30 fake test graphs)\n',
              'Bot type: **camouflaged** (a real-news training user\'s full feature vector + Gaussian noise, σ = 0.01). '
              'Chance level (`bot_fraction_root_neighbours`): every bot is attached directly to the root, so for each '
              'graph we take the share of bots among the root\'s direct (1-hop) neighbours, then average over the 30 '
              'graphs. This is the bot share expected in the top-10 if the explainer picked root neighbours at random. '
              'The share of bots among *all* nodes (`bot_fraction`) is lower and would overstate the effect.\n',
              md(e.reset_index())]
    if osp.exists(out('findings.md')):
        s += ['\n' + open(out('findings.md'), encoding='utf-8').read()]
    open(out('results_summary.md'), 'w', encoding='utf-8').write('\n'.join(s) + '\n')
    print(open(out('results_summary.md'), encoding='utf-8').read())


if __name__ == '__main__':
    for st in args.stages:
        t = time.time()
        print(f'\n===== {st} ({DS}) =====')
        globals()[st]()
        print(f'[{st} took {time.time() - t:.0f}s]')
