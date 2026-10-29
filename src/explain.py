"""GNNExplainer figures: node colour = importance, root bigger, bots red outline, top-10% edges thicker."""
import matplotlib.pyplot as plt
import networkx as nx
import torch
from torch_geometric.explain import Explainer, GNNExplainer


def explain(model, g, seed=0):
    torch.manual_seed(seed)
    exp = Explainer(model, GNNExplainer(epochs=200), explanation_type='model', node_mask_type='object',
                    edge_mask_type='object',
                    model_config=dict(mode='multiclass_classification', task_level='graph', return_type='log_probs'))
    e = exp(g.x, g.edge_index, batch=torch.zeros(g.num_nodes, dtype=torch.long))
    return e.node_mask.view(-1).detach(), e.edge_mask.detach()


def top10_bot_share(node_mask, is_bot):
    return float(is_bot[node_mask.topk(min(10, len(node_mask))).indices].float().mean())


def draw(ax, g, node_mask, edge_mask, title, pos=None):
    G = nx.Graph()
    G.add_nodes_from(range(g.num_nodes))
    ei = g.edge_index.t().tolist()
    G.add_edges_from(ei)
    pos = pos or nx.spring_layout(G, seed=0)
    thr = torch.quantile(edge_mask, 0.9)
    w = {}  # undirected edge -> max mask over its two directions
    for (u, v), m in zip(ei, edge_mask.tolist()):
        k = (min(u, v), max(u, v)); w[k] = max(w.get(k, 0.), m)
    edges = list(w)
    nx.draw_networkx_edges(G, pos, edgelist=edges, ax=ax, edge_color='#9a9a96',
                           width=[2.5 if w[e] >= thr else 0.4 for e in edges])
    is_bot = g.is_bot if 'is_bot' in g else torch.zeros(g.num_nodes, dtype=torch.bool)
    nm = (node_mask / (node_mask.max() + 1e-12)).tolist()
    nx.draw_networkx_nodes(G, pos, ax=ax, node_color=nm, cmap='Blues', vmin=0, vmax=1,
                           node_size=[260 if i == 0 else 40 for i in range(g.num_nodes)],
                           edgecolors=['#e34948' if b else '#52514e' for b in is_bot.tolist()],
                           linewidths=[1.8 if b else 0.3 for b in is_bot.tolist()])
    ax.set_title(title, fontsize=9); ax.axis('off')
    return pos
