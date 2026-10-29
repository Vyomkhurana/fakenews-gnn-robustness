"""Net adapted from pyg-team/pytorch_geometric examples/upfd.py (MIT): one conv -> global max pool
-> concat root (news) node features -> linear -> log_softmax. Root = first node of each graph."""
import torch
from torch.nn import Linear
from torch_geometric.nn import GATConv, GCNConv, SAGEConv, global_max_pool

CONVS = {'GCN': GCNConv, 'GAT': GATConv, 'SAGE': SAGEConv}


class Net(torch.nn.Module):
    def __init__(self, model, in_channels, hidden_channels=128, out_channels=2, concat=True):
        super().__init__()
        self.concat = concat
        self.conv1 = CONVS[model](in_channels, hidden_channels)
        if concat:
            self.lin0 = Linear(in_channels, hidden_channels)
            self.lin1 = Linear(2 * hidden_channels, hidden_channels)
        self.lin2 = Linear(hidden_channels, out_channels)

    def forward(self, x, edge_index, batch):
        h = self.conv1(x, edge_index).relu()
        h = global_max_pool(h, batch)
        if self.concat:
            root = (batch[1:] - batch[:-1]).nonzero(as_tuple=False).view(-1)
            root = torch.cat([root.new_zeros(1), root + 1], dim=0)
            news = self.lin0(x[root]).relu()
            h = self.lin1(torch.cat([news, h], dim=-1)).relu()
        return self.lin2(h).log_softmax(dim=-1)
