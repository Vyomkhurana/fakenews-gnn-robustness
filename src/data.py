"""UPFD loading + profile-column helpers.

Label convention (confirmed by the UPFD author, GNN-FakeNews issue #17): y=1 FAKE, y=0 REAL.
Node 0 of every graph is the root (news) node; all other nodes are users.

Profile block (utils/profile_feature.py in GNN-FakeNews), min-max normalised to [0,1]:
 0 verified, 1 geo_enabled, 2 followers, 3 friends, 4 statuses, 5 favourites,
 6 listed, 7 account created (months since Mar 2006, bigger = newer), 8 name words, 9 description words.
For feature='content' (300 spaCy + 10 profile) the profile block is columns 300..309
(verified in run_all.py check_data: exact for ~85% of user rows, corr >= 0.92 per column).
"""
import os.path as osp

import torch
from torch_geometric.datasets import UPFD
from torch_geometric.transforms import ToUndirected

ROOT = osp.join(osp.dirname(osp.dirname(osp.abspath(__file__))), 'data')
FAKE, REAL = 1, 0
FOLLOWERS, FRIENDS, STATUSES, FAVOURITES, LISTED, AGE, VERIFIED = 2, 3, 4, 5, 6, 7, 0
PROFILE_OFFSET = {'content': 300, 'profile': 0}  # bert/spacy carry no profile block


def load(name='politifact', feature='content', split='train'):
    return [g for g in UPFD(ROOT, name, feature, split, ToUndirected())]


def prof_col(feature, col):
    return PROFILE_OFFSET[feature] + col


def user_x(graphs, label=None):
    """Stack features of all non-root nodes (optionally only from graphs with this label)."""
    return torch.cat([g.x[1:] for g in graphs if label is None or int(g.y) == label])
