"""Defense B: rule-based bot filter learned from clean TRAIN users.
Defense A (adversarial training) lives in train.py (adv=True) and uses adv_augment below."""
import random

import torch
from torch_geometric.data import Data
from torch_geometric.utils import subgraph

from attack import inject
from data import AGE, FOLLOWERS, STATUSES, prof_col, user_x


class BotFilter:
    """Flag a user if: newest-5% account AND bottom-5% followers AND bottom-5% statuses."""

    def __init__(self, train_graphs, feature='content', q=0.05):
        u = user_x(train_graphs)
        self.age_c, self.fol_c, self.st_c = (prof_col(feature, c) for c in (AGE, FOLLOWERS, STATUSES))
        self.age_thr = torch.quantile(u[:, self.age_c], 1 - q)
        self.fol_thr = torch.quantile(u[:, self.fol_c], q)
        self.st_thr = torch.quantile(u[:, self.st_c], q)

    def flag(self, x):
        f = (x[:, self.age_c] >= self.age_thr) & (x[:, self.fol_c] <= self.fol_thr) & (x[:, self.st_c] <= self.st_thr)
        f[0] = False  # never remove the root
        return f

    def __call__(self, g):
        keep = ~self.flag(g.x)
        ei, _ = subgraph(keep, g.edge_index, relabel_nodes=True, num_nodes=g.num_nodes)
        out = Data(x=g.x[keep], edge_index=ei, y=g.y)
        if 'is_bot' in g:
            out.is_bot = g.is_bot[keep]
        return out


def adv_augment(graphs, bots, rng, gen, frac=0.5, ps=(0.05, 0.10, 0.20), types=('naive', 'camo')):
    """Each call (= each epoch): ~frac of FAKE training graphs get bots with random p and type."""
    out = []
    for g in graphs:
        if int(g.y) == 1 and rng.random() < frac:
            g = inject(g, rng.choice(ps), rng.choice(types), bots, gen)
        out.append(Data(x=g.x, edge_index=g.edge_index, y=g.y))
    return out
