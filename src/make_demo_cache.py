"""Build results/demo_cache.pt for the live demo (app.py / src/demo.py). Run once: python src/make_demo_cache.py
Uses only saved weights. Picks 3 FAKE PolitiFact test graphs where
 a) normal GCN s0 says FAKE on the clean graph,
 b) 20% greedy bots crafted against the normal GCN flip it to REAL,
 c) the bot filter does NOT save it,
 d) the adv-trained GCN s0, under greedy bots re-crafted against it, says FAKE."""
import os.path as osp

import networkx as nx
import torch

from attack import Bots, inject_greedy
from data import load
from defense import BotFilter
from explain import explain
from models import Net
from train import MODELS, RESULTS

P, SEED, N_STORIES = 0.20, 0, 3


def load_net(tag, dim):
    m = Net('GCN', dim)
    m.load_state_dict(torch.load(osp.join(MODELS, f'{tag}.pt')))
    return m.eval()


@torch.no_grad()
def p_fake(m, g):
    return float(m(g.x, g.edge_index, torch.zeros(g.num_nodes, dtype=torch.long))[0, 1].exp())


def layout(att):
    """One spring layout of the attacked graph (bots included), news node at (0,0); reused for every step.
    Both attacked versions share the same bot slots (all attached to the root only), so it fits both."""
    G = nx.Graph(att.edge_index.t().tolist())
    G.add_nodes_from(range(att.num_nodes))
    pos = nx.spring_layout(G, seed=0)
    xy = torch.tensor([pos[i] for i in range(att.num_nodes)], dtype=torch.float)
    return xy - xy[0].clone()


def main():
    tr, te = load('politifact', 'content', 'train'), load('politifact', 'content', 'test')
    bots, filt = Bots(tr), BotFilter(tr)
    base = load_net(f'politifact_content_GCN_s{SEED}', tr[0].num_features)
    adv = load_net(f'politifact_content_GCN_s{SEED}_adv', tr[0].num_features)
    fake = [i for i, g in enumerate(te) if int(g.y) == 1]
    # readable sizes first (20-80 nodes, smallest first), then larger graphs only if needed
    order = sorted(fake, key=lambda i: (not 20 <= te[i].num_nodes <= 80, te[i].num_nodes))
    tried, full = [], 0
    for i in order:
        in_range = 20 <= te[i].num_nodes <= 80
        if (not in_range and full >= N_STORIES) or te[i].num_nodes > 150:
            break
        g = te[i]
        att_b = inject_greedy(g, P, bots, base, torch.Generator().manual_seed(SEED + i))
        att_a = inject_greedy(g, P, bots, adv, torch.Generator().manual_seed(SEED + i))
        filt_b = filt(att_b)
        p = [p_fake(base, g), p_fake(base, att_b), p_fake(base, filt_b), p_fake(adv, att_a)]
        ok = dict(a_clean_fake=p[0] > .5, b_attack_flips=p[1] < .5, c_filter_fails=p[2] < .5, d_adv_fake=p[3] > .5)
        margin = min(abs(v - .5) for v in p)  # how far the closest step is from the 0.5 decision line
        tried.append((sum(ok.values()), margin, i, g, att_b, att_a, p, ok))
        full += all(ok.values())
        print(f'graph {i:3d} ({g.num_nodes:3d} nodes): P(fake) = ' + ' -> '.join(f'{v:.3f}' for v in p) + f'  {ok}')
    tried.sort(key=lambda t: t[:2], reverse=True)  # all checks passed first, then clearest margins
    stories = []
    for _, _, i, g, att_b, att_a, p, ok in tried[:N_STORIES]:
        keep = ~filt.flag(att_b.x)
        filt_b = filt(att_b)
        imp = []
        for m, gg in [(base, g), (base, att_b), (base, filt_b), (adv, att_a)]:
            imp.append(explain(m, gg)[0])
        full_imp = torch.zeros(att_b.num_nodes)  # map step-3 importance back to att_b node ids
        full_imp[keep] = imp[2]
        imp[2] = full_imp
        k = int(att_b.is_bot.sum())
        assert k == int(att_a.is_bot.sum()) and att_b.is_bot[:g.num_nodes].sum() == 0
        stories.append(dict(graph_idx=i, n=g.num_nodes, k=k, p_fake=p, checks=ok, pos=layout(att_b),
                            x_clean=g.x, edge_index_clean=g.edge_index,
                            x_att_base=att_b.x, edge_index_att_base=att_b.edge_index,
                            x_att_adv=att_a.x, edge_index_att_adv=att_a.edge_index,
                            bot_idx=torch.arange(g.num_nodes, g.num_nodes + k),
                            filter_keep=keep, importance=imp))
        print(f'chosen graph {i}: {g.num_nodes} nodes, {k} bots, P(fake) {[round(v, 3) for v in p]}, checks {ok}')
    # clone: dataset tensors are views into the full split's storage, which torch.save would write out whole
    stories = [{key: v.clone() if torch.is_tensor(v) else [t.clone() for t in v] if key == 'importance' else v
                for key, v in st.items()} for st in stories]
    torch.save(dict(stories=stories, p=P, seed=SEED, model='GCN'), osp.join(RESULTS, 'demo_cache.pt'))
    print('saved', osp.join(RESULTS, 'demo_cache.pt'))


if __name__ == '__main__':
    main()
