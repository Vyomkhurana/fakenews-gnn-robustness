"""Export real saved outputs for the web demo (demo-web/). Run: python src/export_demo_json.py
 - demo-web/src/data/stories.json  <- results/demo_cache.pt (+ dataset files for headlines / profile percentiles)
 - demo-web/src/data/results.json  <- results/*.csv
Headlines: root node -> PolitiFact news id via GNN-FakeNews data/pol_id_twitter_mapping.pkl, then the title from
FakeNewsNet dataset/politifact_fake.csv (both saved under data/meta/). Missing files -> neutral label, never invented."""
import html
import json
import os.path as osp
import pickle
from collections import deque

import numpy as np
import pandas as pd
import torch

from data import AGE, FOLLOWERS, STATUSES, load, prof_col, user_x

ROOT = osp.dirname(osp.dirname(osp.abspath(__file__)))
RES, RAW, META = osp.join(ROOT, 'results'), osp.join(ROOT, 'data', 'politifact', 'raw'), osp.join(ROOT, 'data', 'meta')
OUT = osp.join(ROOT, 'demo-web', 'src', 'data')
ARCHS = ['GCN', 'GAT', 'SAGE']
r3 = lambda v: round(float(v), 3)
csv = lambda f: pd.read_csv(osp.join(RES, f))


def headlines():
    """test-split graph index -> (news id, title). Empty if the metadata files are missing."""
    try:
        with open(osp.join(META, 'pol_id_twitter_mapping.pkl'), 'rb') as f:
            mapping = pickle.load(f)  # plain {node index: id string}; audited with pickletools (no code opcodes)
        fake = pd.read_csv(osp.join(META, 'politifact_fake.csv'))
    except FileNotFoundError:
        return {}
    ngi, test = np.load(osp.join(RAW, 'node_graph_id.npy')), np.load(osp.join(RAW, 'test_idx.npy'))
    first = {}
    for i, g in enumerate(ngi):
        first.setdefault(int(g), i)
    titles = dict(zip(fake.id, fake.title))
    clean = lambda t: html.unescape(t).replace('�', "'").strip()
    return {ti: (mapping[first[int(g)]], clean(titles[mapping[first[int(g)]]]) if mapping[first[int(g)]] in titles else None)
            for ti, g in enumerate(test)}


def bfs(n, edges):
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v); adj[v].append(u)
    depth, order, q = [-1] * n, [], deque([0])
    depth[0] = 0
    while q:
        u = q.popleft(); order.append(u)
        for v in sorted(adj[u]):
            if depth[v] < 0:
                depth[v] = depth[u] + 1; q.append(v)
    return depth, {u: i for i, u in enumerate(order)}


def stories():
    cache = torch.load(osp.join(RES, 'demo_cache.pt'))
    heads = headlines()
    train_u = user_x(load('politifact', 'content', 'train'))
    cols = [prof_col('content', c) for c in (FOLLOWERS, STATUSES, AGE)]
    ref = [train_u[:, c].sort().values for c in cols]
    pct = lambda row: [int(100 * torch.searchsorted(r, row[c].contiguous().view(1), right=True).item() / len(r))
                       for c, r in zip(cols, ref)]
    rng = np.random.default_rng(7)
    out = []
    for s in cache['stories']:
        n, k = s['n'], s['k']
        pos = s['pos'] / s['pos'].abs().max() * 500
        edges = sorted({(min(u, v), max(u, v)) for u, v in s['edge_index_clean'].t().tolist() if u != v})
        depth, order = bfs(n, edges)
        handles = rng.choice(np.arange(1000, 10000), size=n + k, replace=False)
        nodes = []
        for i in range(n + k):
            bot = i >= n
            f = pct(s['x_att_base'][i])
            nodes.append(dict(id=i, type='news' if i == 0 else 'bot' if bot else 'user',
                              x=round(float(pos[i, 0]), 1), y=round(float(pos[i, 1]), 1),
                              depth=1 if bot else depth[i], order=i - n if bot else order[i],
                              handle='news' if i == 0 else f'@user_{handles[i]}',
                              followersPct=f[0], statusesPct=f[1], agePct=f[2]))
        imp = []
        for st, raw in enumerate(s['importance']):
            raw = torch.cat([raw, torch.zeros(n + k - len(raw))])  # step 1 has no bots yet
            vis = s['filter_keep'].clone() if st == 2 else torch.ones(n + k, dtype=torch.bool)
            if st == 0:
                vis[n:] = False
            vis[0] = False
            lo, hi = raw[vis].min(), raw[vis].max()
            imp.append([r3(v) for v in ((raw - lo) / (hi - lo + 1e-12)).clamp(0, 1) * vis.float()])
        news_id, title = heads.get(s['graph_idx'], (None, None))
        keep = s['filter_keep']
        out.append(dict(testIndex=s['graph_idx'], newsId=news_id, headline=title,
                        label=f"PolitiFact story #{s['graph_idx']}", truth='FAKE', n=n, users=n - 1, k=k,
                        edgeCount=len(edges), maxDepth=max(depth), nodes=nodes, edges=edges,
                        bots=list(range(n, n + k)), p=[r3(v) for v in s['p_fake']], importance=imp,
                        filter=dict(checked=n - 1 + k, flagged=int((~keep).sum()), flaggedBots=int((~keep[n:]).sum())),
                        advBots=[dict(zip(['followersPct', 'statusesPct', 'agePct'], pct(r))) for r in s['x_att_adv'][n:]]))
    return out


def results():
    def base(df):
        return [dict(model=m, acc=r3(d.acc.mean()), accStd=r3(d.acc.std()), precision=r3(d.precision.mean()),
                     recall=r3(d.recall.mean()), f1=r3(d.f1.mean()), f1Std=r3(d.f1.std()))
                for m, d in df[df.feature == 'content'].groupby('model', sort=False)]

    a, gr, tr = csv('attack_per_seed.csv'), pd.concat([csv(f'greedy_{m}.csv') for m in ARCHS]), csv('greedy_transfer.csv')
    dps = csv('defense_per_seed.csv')
    clean0 = dps[(dps.seed == 0) & (dps.p == 0) & (dps.bot_type == 'naive')].set_index(['model', 'defense'])['acc']
    curves, defense = [], {}
    for i, p in enumerate([0, .05, .10, .20]):
        row = dict(p=int(p * 100))
        for m in ARCHS:
            mean = a[(a.model == m) & (a.p == p)].groupby('bot_type')['acc'].mean()
            row[f'{m}_naive'], row[f'{m}_camo'] = r3(mean['naive']), r3(mean['camo'])
            g = gr[(gr.model == m) & (gr.defense == 'none') & (gr.p == p)]
            row[f'{m}_greedy'] = r3(clean0[m, 'none']) if p == 0 else r3(g.acc.iloc[0])
            if p:
                row[f'{m}_greedy_asr'] = r3(g.asr.iloc[0])
        curves.append(row)
    for m in ARCHS:
        g = gr[(gr.model == m) & (gr.p == .2)].set_index('defense')
        t = tr[(tr.model == m) & (tr.p == .2)].set_index('defense')
        defense[m] = dict(clean=r3(clean0[m, 'none']), attack=r3(g.acc['none']), filter=r3(g.acc['filter']),
                          adv=r3(g.acc['adv']), advFilter=r3(g.acc['both']), advTransfer=r3(t.acc['adv']),
                          advFilterTransfer=r3(t.acc['both']), advClean=r3(clean0[m, 'adv']),
                          asrAttack=r3(g.asr['none']), asrAdv=r3(g.asr['adv']), asrAdvTransfer=r3(t.asr['adv']))
    adv3 = dps[(dps.p == 0) & (dps.bot_type == 'naive') & (dps.defense == 'adv')].groupby('model')['acc'].agg(['mean', 'std'])
    ex = csv('explain_top10_bots_per_graph.csv').groupby('model')[['bot_fraction_root_neighbours', 'top10_bot_share']].mean()
    fd = csv('filter_diagnostics.csv').set_index('metric')['value']
    gd = csv('gossipcop_defense_per_seed.csv')
    gm = gd[gd.p.isin([0, .2])].groupby(['model', 'defense', 'bot_type', 'p'])['acc'].mean()
    gfd = csv('gossipcop_filter_diagnostics.csv').set_index('metric')['value']
    nodes = {d: int(len(np.load(osp.join(ROOT, 'data', d, 'raw', 'node_graph_id.npy')))) for d in ('politifact', 'gossipcop')}
    return dict(
        datasets=dict(politifact=dict(graphs=314, train=62, val=31, test=221, nodes=nodes['politifact']),
                      gossipcop=dict(graphs=5464, train=1092, val=546, test=3826, nodes=nodes['gossipcop'])),
        baseline=dict(politifact=base(csv('baseline_per_seed.csv')), gossipcop=base(csv('gossipcop_baseline_per_seed.csv'))),
        attackCurve=curves, defense20=defense,
        advClean3={m: dict(mean=r3(adv3.loc[m, 'mean']), std=r3(adv3.loc[m, 'std'])) for m in ARCHS},
        filter=dict(falseRemovalTest=r3(fd['false removal rate (test genuine users)']),
                    falseRemovalTrain=r3(fd['false removal rate (train genuine users)']),
                    naiveRemoved20=r3(fd['bots removed (naive, p=0.2)']), camoRemoved20=r3(fd['bots removed (camo, p=0.2)']),
                    greedyRemoved20=r3(gr[(gr.defense == 'none') & (gr.p == .2)].bots_removed_by_filter.mean())),
        explainTop10=dict(normal=r3(ex.loc['normal', 'top10_bot_share']), adv=r3(ex.loc['adv-trained', 'top10_bot_share']),
                          chance=r3(ex.loc['normal', 'bot_fraction_root_neighbours']), graphs=30, model='GCN seed 0',
                          botType='camouflaged', p=20),
        gossipcop=dict(models={m: dict(clean=r3(gm[m, 'none', 'camo', 0]), camo20=r3(gm[m, 'none', 'camo', .2]),
                                       camo20Adv=r3(gm[m, 'adv', 'camo', .2]), naive20=r3(gm[m, 'none', 'naive', .2]),
                                       naive20Filter=r3(gm[m, 'filter', 'naive', .2])) for m in ARCHS},
                       falseRemovalTest=r3(gfd['false removal rate (test genuine users)'])))


def main():
    for name, obj in [('stories.json', stories()), ('results.json', results())]:
        with open(osp.join(OUT, name), 'w', encoding='utf-8') as f:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        print('saved', osp.join(OUT, name))


if __name__ == '__main__':
    main()
