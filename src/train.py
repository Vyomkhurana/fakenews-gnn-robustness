"""Train/evaluate loop from PyG examples/upfd.py (Adam lr=1e-3, wd=0.01, batch 128, 60 epochs, NLL).
Model selection: epoch with best val accuracy (ties -> lower val loss). Weights cached in results/models/."""
import os
import os.path as osp
import random

import numpy as np
import torch
import torch.nn.functional as F
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from torch_geometric.loader import DataLoader

from models import Net

RESULTS = osp.join(osp.dirname(osp.dirname(osp.abspath(__file__))), 'results')
MODELS = osp.join(RESULTS, 'models')


def set_seed(seed):
    random.seed(seed); np.random.seed(seed); torch.manual_seed(seed)


@torch.no_grad()
def predict(model, graphs, bs=128):
    model.eval()
    ys, ps, loss = [], [], 0.
    for b in DataLoader(graphs, batch_size=bs):
        out = model(b.x, b.edge_index, b.batch)
        loss += float(F.nll_loss(out, b.y, reduction='sum'))
        ys.append(b.y); ps.append(out.argmax(-1))
    return torch.cat(ys).numpy(), torch.cat(ps).numpy(), loss / len(graphs)


def metrics(y, p):
    pr, rc, f1, _ = precision_recall_fscore_support(y, p, average='macro', zero_division=0)
    return dict(acc=accuracy_score(y, p), precision=pr, recall=rc, f1=f1)


def train(arch, train_g, val_g, seed, tag, epochs=60, augment=None, verbose=False):
    """augment(graphs) -> graphs is called every epoch (used for adversarial training)."""
    os.makedirs(MODELS, exist_ok=True)
    path = osp.join(MODELS, f'{tag}.pt')
    set_seed(seed)
    model = Net(arch, train_g[0].num_features)
    if osp.exists(path):
        model.load_state_dict(torch.load(path))
        return model.eval()
    opt = torch.optim.Adam(model.parameters(), lr=0.001, weight_decay=0.01)
    best, best_state = (-1, 0), None
    for ep in range(1, epochs + 1):
        model.train()
        data = augment(train_g) if augment else train_g
        for b in DataLoader(data, batch_size=128, shuffle=True):
            opt.zero_grad()
            F.nll_loss(model(b.x, b.edge_index, b.batch), b.y).backward()
            opt.step()
        y, p, vloss = predict(model, val_g)
        score = (accuracy_score(y, p), -vloss)
        if score > best:
            best, best_state, best_ep = score, {k: v.clone() for k, v in model.state_dict().items()}, ep
        if verbose:
            print(f'{tag} ep{ep:02d} val_acc={score[0]:.3f} val_loss={vloss:.3f}')
    model.load_state_dict(best_state)
    torch.save(best_state, path)
    print(f'  trained {tag}: best val acc {best[0]:.3f} @ epoch {best_ep}')
    return model.eval()
