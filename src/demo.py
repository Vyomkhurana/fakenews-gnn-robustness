"""Terminal fallback for the live demo + drawing code shared with app.py.
Usage: python src/demo.py   (prints the 4 steps per story, saves results/demo_flip.png). Needs results/demo_cache.pt."""
import os.path as osp

import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt
import torch

ROOT = osp.dirname(osp.dirname(osp.abspath(__file__)))
CACHE = osp.join(ROOT, 'results', 'demo_cache.pt')
NEWS, USER, BOT, EDGE = '#6250d6', '#86b6ef', '#e34948', '#b9b8b2'
STEPS = ['1. Clean', '2. Add 20% smart bots', '3. Bot filter on', '4. Adversarial training']


def load_cache():
    return torch.load(CACHE)


def step_info(s, step):
    """Everything needed to show one step of one story (step = 0..3)."""
    p = s['p_fake'][step]
    label = 'FAKE' if p > 0.5 else 'REAL'
    keep = s['filter_keep']
    removed, removed_bots = int((~keep).sum()), int((~keep[s['n']:]).sum())
    k = s['k']
    model = 'GCN (normal training)' if step < 3 else 'GCN (adversarially trained)'
    setting, sentence = [
        ('Clean propagation graph',
         f'On the real sharing pattern, the normal GCN says {label}.'),
        (f'+{k} greedy bots (20%), chosen to fool this model',
         f'{k} bots copied from real-news users reshare the story straight from the source; the same model now says {label}.'),
        ('+ same bots, rule-based bot filter on',
         (f'The filter flags no one: these bots copy real users\' profiles, so nothing is removed and the verdict '
          f'stays {label}.') if removed == 0 else
         (f'The filter removed {removed} users ({removed_bots} of them bots, hollow circles); most bots copy real '
          f'profiles and stay, so the verdict is {label}.')),
        (f'+{k} greedy bots re-chosen against this model',
         f'A GCN trained on bot-injected examples, attacked by bots picked to fool it, says {label}.'),
    ][step]
    ei = s['edge_index_clean'] if step == 0 else s['edge_index_att_adv'] if step == 3 else s['edge_index_att_base']
    n_nodes = s['n'] if step == 0 else s['n'] + k
    return dict(p=p, label=label, model=model, setting=setting, sentence=sentence, edge_index=ei, n_nodes=n_nodes,
                hidden=(~keep) if step == 2 else torch.zeros(n_nodes, dtype=torch.bool), importance=s['importance'][step])


def draw(ax, s, step, show_importance=False):
    info = step_info(s, step)
    pos, n, nn = s['pos'], s['n'], info['n_nodes']
    is_bot = torch.arange(nn) >= n
    hidden = info['hidden']
    for u, v in info['edge_index'].t().tolist():
        if u < v and not (hidden[u] or hidden[v]):
            bot_edge = bool(is_bot[u] or is_bot[v])
            ax.plot(*pos[[u, v]].t(), color=BOT if bot_edge else EDGE, lw=1.2 if bot_edge else 0.8,
                    ls='--' if bot_edge else '-', zorder=1)
    # colour users/bots by importance, min-max over visible non-news nodes (the news node always dominates)
    raw = info['importance']
    vis = raw[1:][~hidden[1:]]
    imp = ((raw - vis.min()) / (vis.max() - vis.min() + 1e-12)).clamp(0, 1)
    cmap = plt.get_cmap('YlOrBr')
    for i in range(nn):
        size = 520 if i == 0 else 70 if is_bot[i] else 55
        if hidden[i]:  # removed by the filter: hollow ghost
            ax.scatter(*pos[i], s=size, facecolor='none', edgecolor='#c3c2b7', lw=1, zorder=2)
            continue
        base = NEWS if i == 0 else BOT if is_bot[i] else USER
        face = cmap(0.05 + 0.95 * float(imp[i])) if show_importance and i > 0 else base
        edge = base if show_importance else 'white'
        ax.scatter(*pos[i], s=size, facecolor=face, edgecolor=edge, lw=2 if show_importance else 0.8, zorder=3)
    ax.set_aspect('equal'); ax.axis('off')
    lim = float(pos.abs().max()) * 1.08
    ax.set_xlim(-lim, lim); ax.set_ylim(-lim, lim)
    return info


def main():
    cache = load_cache()
    stories = cache['stories']
    fig, axes = plt.subplots(len(stories), 4, figsize=(16, 4.3 * len(stories)))
    for r, s in enumerate(stories):
        print(f"\nStory {r + 1}: PolitiFact test graph {s['graph_idx']} ({s['n'] - 1} users + news node), truth = FAKE")
        for step in range(4):
            info = draw(axes[r, step], s, step)
            print(f"  {STEPS[step]:26s} {info['model']:28s} P(fake) = {info['p']:.3f} -> {info['label']}")
            print(f"  {'':26s} {info['sentence']}")
            axes[r, step].set_title(f"{STEPS[step]}\n{info['model']}\nP(fake) = {info['p']:.3f} -> {info['label']}",
                                    fontsize=9, color='#e34948' if info['label'] == 'FAKE' else '#008300')
    fig.suptitle('Fake news under bot attack (GCN, PolitiFact). Purple = news, blue = users, red = bots '
                 '(dashed = reshared from the news), hollow = removed by the filter', fontsize=10)
    fig.tight_layout(rect=(0, 0, 1, 0.97))
    out = osp.join(ROOT, 'results', 'demo_flip.png')
    fig.savefig(out, dpi=120); plt.close(fig)
    print('\nsaved', out)


if __name__ == '__main__':
    main()
