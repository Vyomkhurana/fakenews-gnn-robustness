"""Check every number the web demo shows (demo-web/src/data/*.json) against results_summary.md,
gossipcop_results_summary.md, the per-seed CSVs and demo_cache.pt. Run: python src/check_demo_numbers.py"""
import json
import os.path as osp
import re

import numpy as np
import pandas as pd
import torch

ROOT = osp.dirname(osp.dirname(osp.abspath(__file__)))
RES = osp.join(ROOT, 'results')
J = lambda f: json.load(open(osp.join(ROOT, 'demo-web', 'src', 'data', f), encoding='utf-8'))
md = open(osp.join(RES, 'results_summary.md'), encoding='utf-8').read()
gmd = open(osp.join(RES, 'gossipcop_results_summary.md'), encoding='utf-8').read()
r, stories = J('results.json'), J('stories.json')
rows, bad = [], []


def check(what, shown, source, ok):
    rows.append((what, shown, source, 'OK' if ok else 'MISMATCH'))
    if not ok:
        bad.append(what)


def md_row(text, *cells):
    """markdown table row containing all cells (in order)"""
    return any(all(c in line for c in cells) and line.index(cells[0]) < line.index(cells[-1])
               for line in text.splitlines() if line.startswith('|'))


for m in ['GCN', 'GAT', 'SAGE']:
    b = next(x for x in r['baseline']['politifact'] if x['model'] == m)
    check(f'PolitiFact baseline {m}', f"{b['acc']:.3f} ± {b['accStd']:.3f}", 'results_summary.md §1',
          md_row(md, '| content', f'| {m} ', f"{b['acc']:.3f} ± {b['accStd']:.3f}"))
    g = next(x for x in r['baseline']['gossipcop'] if x['model'] == m)
    check(f'GossipCop baseline {m}', f"{g['acc']:.3f} ± {g['accStd']:.3f}", 'gossipcop_results_summary.md §1',
          md_row(gmd, '| content', f'| {m} ', f"{g['acc']:.3f} ± {g['accStd']:.3f}"))
    for bt, name in [('naive', 'naive'), ('camo', 'camouflaged')]:
        for row in r['attackCurve']:
            v = row[f'{m}_{bt}']
            line = next(l for l in md.splitlines() if l.startswith(f'| {m} ') and f'| {name} ' in l and '±' in l)
            check(f'attack curve {m} {bt} p={row["p"]}%', f'{v:.3f}', 'results_summary.md §2', f'{v:.3f} ±' in line)
    for row in r['attackCurve'][1:]:
        v = row[f'{m}_greedy']
        check(f'attack curve {m} greedy p={row["p"]}%', f'{v:.3f}', 'results_summary.md §2 greedy table',
              md_row(md, f'| {m} ', f"| {row['p'] / 100:g} ", f'{v:.3f}'.rstrip('0')))
    d = r['defense20'][m]
    for key, cond in [('attack', 'attack '), ('filter', 'attack + bot filter'), ('adv', 'attack + adv training (adaptive)'),
                      ('advTransfer', 'attack + adv training (transfer)')]:
        rep = pd.read_csv(osp.join(RES, 'robustness_report.csv'))
        x = rep[(rep.model == m) & (rep.bot_type == 'greedy') & (rep.p == 0.2) & (rep.condition == cond.strip())]
        check(f'defense @20% greedy {m} {key}', f'{d[key]:.3f}', 'robustness_report.csv', len(x) == 1 and abs(float(x.acc.iloc[0]) - d[key]) < 5e-4)
    seed0 = pd.read_csv(osp.join(RES, 'defense_per_seed.csv'))
    c = seed0[(seed0.model == m) & (seed0.seed == 0) & (seed0.p == 0) & (seed0.defense == 'none') & (seed0.bot_type == 'naive')].acc.iloc[0]
    check(f'clean seed-0 {m}', f"{d['clean']:.3f}", 'defense_per_seed.csv / results_summary.md §3', abs(c - d['clean']) < 5e-4
          and f'{m} normal {d["clean"]:.3f}' in md)
check('GCN attack success rate @20% greedy', f"{r['defense20']['GCN']['asrAttack']:.1%}", 'results_summary.md §2 greedy table',
      md_row(md, '| GCN ', '| 0.2 ', f"{r['defense20']['GCN']['asrAttack']:.3f}".rstrip('0')))
e = r['explainTop10']
for k in ['normal', 'adv']:
    check(f'explain top-10 bot share {k}', f'{e[k]:.1%}', 'results_summary.md §4', f'{e[k]:.3f}'.rstrip('0') in md)
check('explain chance level', f"{e['chance']:.1%}", 'results_summary.md §4', f"{e['chance']:.3f}".rstrip('0') in md)
fd = float(re.search(r'false removal rate \(test genuine users\)\s*\|\s*([\d.]+)', md).group(1))
check('filter false removal (test)', f"{r['filter']['falseRemovalTest']:.1%}", f'results_summary.md diagnostics ({fd})',
      round(fd, 3) == r['filter']['falseRemovalTest'])
for name in ['politifact', 'gossipcop']:
    n = len(np.load(osp.join(ROOT, 'data', name, 'raw', 'node_graph_id.npy')))
    check(f'{name} node count', r['datasets'][name]['nodes'], 'data/<name>/raw/node_graph_id.npy', n == r['datasets'][name]['nodes'])
check('hero graphs 5,778', r['datasets']['politifact']['graphs'] + r['datasets']['gossipcop']['graphs'], 'README (314 + 5,464)',
      r['datasets']['politifact']['graphs'] == 314 and r['datasets']['gossipcop']['graphs'] == 5464)
cache = torch.load(osp.join(RES, 'demo_cache.pt'))['stories']
for s, c in zip(stories, cache):
    check(f"story #{s['testIndex']} P(fake) x4", s['p'], 'results/demo_cache.pt', all(abs(a - b) < 5e-4 for a, b in zip(s['p'], c['p_fake'])))
    check(f"story #{s['testIndex']} users/bots", f"{s['users']} users, {s['k']} bots", 'results/demo_cache.pt',
          s['users'] == c['n'] - 1 and s['k'] == c['k'])
    check(f"story #{s['testIndex']} filter flagged", f"{s['filter']['flagged']} of {s['filter']['checked']}", 'results/demo_cache.pt',
          s['filter']['flagged'] == int((~c['filter_keep']).sum()))

w = max(len(x[0]) for x in rows)
for what, shown, src, st in rows:
    print(f'{st:8s} {what:{w}s}  {str(shown):22s}  {src}')
print(f'\n{len(rows) - len(bad)}/{len(rows)} checks passed' + (f'; MISMATCHES: {bad}' if bad else ''))
