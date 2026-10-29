# Graph-Based Deep Learning for Fake News Detection & Social Media Propagation Analysis

VIT Vellore, Deep Learning course project.
Tanisi Narwal (23BDS0079): data + base GNNs · Vyom Khurana (23BDS0081): bot attack + defenses · Abhinav Sharma (23BDS0097): explainability, charts, report.

Each news story is a propagation graph: node 0 = the news (root), the other nodes = Twitter users who shared it, and edges = who reshared from whom.
A GNN (GCN / GAT / GraphSAGE) classifies the whole graph as FAKE or REAL. On top of that standard detector we add:

1. **Bot injection attack.** Fake bot users are added to FAKE test graphs (5 / 10 / 20 % of nodes). Each bot reshares directly from the root. There are three bot types:
   - naive (normal text, fresh-bot profile),
   - camouflaged (a copied real user plus noise),
   - optional greedy black-box (chooses the real-user copy that most raises P(real)).
2. **Defenses.**
   - (A) Adversarial training: 50 % of fake training graphs get bots every epoch.
   - (B) A rule-based bot filter: removes users that are newest-5 % accounts AND bottom-5 % followers AND bottom-5 % statuses, with thresholds learned on clean training users only.
3. **Explainability.** GNNExplainer figures for clean / attacked / attacked + adv-trained, and the share of bots among the top-10 important nodes.
4. **Robustness report.** Normal vs attack vs defense for every model.

All results are in [results/results_summary.md](results/results_summary.md).

## How to run

```bash
pip install torch torch_geometric networkx matplotlib pandas scikit-learn tabulate streamlit
python src/run_all.py                 # check p0 p1 p2 p3 p4 on PolitiFact (~5 min on CPU once models are cached)
python src/run_all.py p1g             # optional greedy attack (~10 min per model on CPU)
python src/run_all.py p1g --arch GCN  # ...or one model per process, to parallelise
python src/run_all.py p1t             # optional: greedy bots crafted on the normal model, fed to the adv-trained one (transfer)
python src/run_all.py p4              # rebuild results_summary.md / robustness_report.csv / attack_curve.png
python src/run_all.py check p0 p1 p2 p3 p4 --dataset gossipcop   # outputs prefixed gossipcop_
```

Stages: `check` (data sanity), `p0` (baselines), `p1` (attack), `p2` (defenses), `p1g` (greedy attack, adaptive against each evaluated model), `p1t` (greedy transfer check), `p3` (explanations), `p4` (summary).
Trained weights are cached in `results/models/`. Delete a file there to retrain that model.
`run_all.ipynb` runs the same pipeline in Colab.

### Live demo (offline: saved weights + cache only, no training, no internet)

```bash
python src/make_demo_cache.py   # once: picks 3 fake PolitiFact stories, writes results/demo_cache.pt (needs data/)
streamlit run app.py            # the app: 4 steps (clean -> 20% smart bots -> bot filter -> adversarial training)
python src/demo.py              # fallback: same 4 steps in the terminal + results/demo_flip.png
```

`results/demo_cache.pt` is committed, so `app.py` and `src/demo.py` run without the dataset.

The UPFD data downloads automatically into `data/`. If the Google Drive download fails because of quota limits:
1. Download the dataset zip from the Google Drive link in the [GNN-FakeNews README](https://github.com/safe-graph/GNN-FakeNews#datasets).
2. Unzip its contents into `data/politifact/raw/` (and `data/gossipcop/raw/`), so that `A.txt`, `graph_labels.npy`, `new_*_feature.npz`, etc. sit directly in `raw/`.

## Layout

```
src/data.py      UPFD loading; profile-column constants (content = 300 spaCy + 10 profile, profile block = cols 300..309)
src/models.py    Net (GCN/GAT/SAGE -> global max pool -> concat root/news features -> linear), from PyG examples/upfd.py
src/train.py     training (val-accuracy model selection), metrics (acc, macro P/R/F1), weight caching
src/attack.py    bot injection (naive / camouflaged / greedy); bots are appended after the root, edges root<->bot
src/defense.py   bot filter (torch_geometric.utils.subgraph, root never removed) + adversarial-training augmentation
src/explain.py   GNNExplainer (torch_geometric.explain) + networkx drawing
src/run_all.py   pipeline stages, writes results/
```

## Data facts we verified (see `python src/run_all.py check`)

- PolitiFact split as shipped with UPFD: train 62 (26 fake), val 31 (18 fake), test 221 (113 fake). This is a 20/10/70 split.
- Label 1 = FAKE, 0 = REAL. The UPFD author confirms this in [GNN-FakeNews issue #17](https://github.com/safe-graph/GNN-FakeNews/issues/17).
- In the `content` features, columns 300–309 equal the 10 `profile` columns on 85 % of user rows exactly; per-column correlation is 0.92–1.0. Root rows hold different (aggregated) values.
- Profile values are already min-max normalised to [0, 1]. Followers, for example, have median 3e-5. For that reason all bot / filter thresholds are percentiles of the training users, never raw counts.

## Credits

- Base framework and dataset: **GNN-FakeNews / UPFD** (Apache-2.0), https://github.com/safe-graph/GNN-FakeNews.
  Profile feature definitions come from its `utils/profile_feature.py`.
- Model and training loop adapted from the PyTorch Geometric example `examples/upfd.py` (MIT), https://github.com/pyg-team/pytorch_geometric. Data is loaded with `torch_geometric.datasets.UPFD`.

## Related work

The attack idea is not new. Our contribution is a simple, reproducible bot-injection benchmark on UPFD. It adds two defenses and explanation figures, and compares GCN, GAT and GraphSAGE side by side.

- Y. Dou, K. Shu, C. Xia, P. S. Yu, L. Sun. *User Preference-aware Fake News Detection.* SIGIR 2021. (UPFD dataset and base code)
- H. Wang, Y. Dou, C. Chen, L. Sun, P. S. Yu, K. Shu. *Attacking Fake News Detectors via Manipulating News Social Engagement.* WWW 2023. Attacks GNN fake-news detectors by adding fake engagements with multi-agent RL.
- P. Zhu et al. *A General Black-box Adversarial Attack on Graph-based Fake News Detectors (GAFSI).* arXiv:2404.15744, 2024.
- S. Vosoughi, D. Roy, S. Aral. *The spread of true and false news online.* Science 2018. Background for "real news spreads wide and shallow".
