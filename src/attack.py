"""Bot injection attack. Bots are appended AFTER existing nodes (root stays node 0) and each bot
reshares directly from the root (undirected edge root<->bot). Everything is built from TRAIN users only."""
import torch
from torch_geometric.data import Data

from data import (AGE, FAVOURITES, FOLLOWERS, FRIENDS, LISTED, REAL, STATUSES, VERIFIED,
                  prof_col, user_x)

LOW_COLS = [FOLLOWERS, FRIENDS, STATUSES, FAVOURITES, LISTED]


class Bots:
    def __init__(self, train_graphs, feature='content', noise=0.01):
        self.feature, self.noise = feature, noise
        self.pool = user_x(train_graphs, REAL)          # real-news training users
        allu = user_x(train_graphs)                     # all training users, for percentiles
        self.low = {c: torch.quantile(allu[:, prof_col(feature, c)], 0.05) for c in LOW_COLS}
        self.new_age = torch.quantile(allu[:, prof_col(feature, AGE)], 0.95)

    def make(self, k, bot_type, gen):
        x = self.pool[torch.randint(len(self.pool), (k,), generator=gen)].clone()
        if bot_type == 'naive':  # normal-looking text, fresh-bot profile
            for c, v in self.low.items():
                x[:, prof_col(self.feature, c)] = v
            x[:, prof_col(self.feature, AGE)] = self.new_age
            x[:, prof_col(self.feature, VERIFIED)] = 0.
        elif bot_type == 'camo':  # copy a real user's full vector + small noise
            x = (x + self.noise * torch.randn(x.shape, generator=gen)).clamp(0, 1)
        else:
            raise ValueError(bot_type)
        return x


def n_bots(num_nodes, p):
    return 0 if p == 0 else max(1, int(p * num_nodes + 0.5))


def append_bots(g, xb):
    n, k = g.num_nodes, len(xb)
    new = torch.arange(n, n + k)
    root = torch.zeros(k, dtype=torch.long)
    ei = torch.cat([g.edge_index, torch.stack([root, new]), torch.stack([new, root])], 1)
    old = g.is_bot if 'is_bot' in g else torch.zeros(n, dtype=torch.bool)
    is_bot = torch.cat([old, torch.ones(k, dtype=torch.bool)])
    return Data(x=torch.cat([g.x, xb]), edge_index=ei, y=g.y, is_bot=is_bot)


def inject(g, p, bot_type, bots, gen):
    k = n_bots(g.num_nodes, p)
    if k == 0:
        return Data(x=g.x, edge_index=g.edge_index, y=g.y, is_bot=torch.zeros(g.num_nodes, dtype=torch.bool))
    return append_bots(g, bots.make(k, bot_type, gen))


@torch.no_grad()
def inject_greedy(g, p, bots, model, gen, n_cand=30):
    """Black-box greedy: for each bot slot, try n_cand real-news users in one batched forward pass,
    keep the one that most increases P(real)."""
    model.eval()
    cur = inject(g, 0, 'camo', bots, gen)
    for _ in range(n_bots(g.num_nodes, p)):
        cand = bots.pool[torch.randint(len(bots.pool), (n_cand,), generator=gen)]
        # batch of n_cand copies of cur, copy j gets candidate j appended as node n (tensor ops, no Data objects)
        n, C = cur.num_nodes, n_cand
        x = torch.cat([cur.x.expand(C, -1, -1), cand[:, None]], 1).reshape(C * (n + 1), -1)
        off = torch.arange(C) * (n + 1)
        ei = (cur.edge_index[:, None, :] + off[None, :, None]).reshape(2, -1)
        ei = torch.cat([ei, torch.stack([off, off + n]), torch.stack([off + n, off])], 1)
        batch = torch.arange(C).repeat_interleave(n + 1)
        best = model(x, ei, batch)[:, REAL].argmax()
        cur = append_bots(cur, cand[best][None])
    return cur


def attack_set(graphs, p, bot_type, bots, seed, model=None):
    """Attack only FAKE graphs; REAL graphs pass through untouched."""
    gen = torch.Generator().manual_seed(seed)
    out = []
    for g in graphs:
        if int(g.y) != 1 or p == 0:
            out.append(inject(g, 0, 'naive', bots, gen))
        elif bot_type == 'greedy':
            out.append(inject_greedy(g, p, bots, model, gen))
        else:
            out.append(inject(g, p, bot_type, bots, gen))
    return out
