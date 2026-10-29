# Results summary (Politifact, all numbers produced by src/run_all.py)

## 1. Baseline detectors (test set, 3 seeds, mean ± std, macro P/R/F1)

| feature   | model   | acc           | precision     | recall        | f1            |
|:----------|:--------|:--------------|:--------------|:--------------|:--------------|
| content   | GCN     | 0.846 ± 0.005 | 0.848 ± 0.006 | 0.845 ± 0.004 | 0.846 ± 0.004 |
| content   | GAT     | 0.860 ± 0.020 | 0.862 ± 0.018 | 0.859 ± 0.020 | 0.859 ± 0.020 |
| content   | SAGE    | 0.843 ± 0.011 | 0.852 ± 0.006 | 0.841 ± 0.012 | 0.842 ± 0.012 |
| bert      | GCN     | 0.833 ± 0.005 | 0.838 ± 0.005 | 0.834 ± 0.005 | 0.832 ± 0.005 |
| bert      | GAT     | 0.827 ± 0.003 | 0.833 ± 0.002 | 0.828 ± 0.003 | 0.826 ± 0.003 |
| bert      | SAGE    | 0.831 ± 0.003 | 0.835 ± 0.004 | 0.832 ± 0.003 | 0.831 ± 0.003 |

## 2. Bot injection attack: test accuracy vs bot budget p (only FAKE test graphs attacked; 3 seeds)

| model   | bot_type    | 0.0           | 0.05          | 0.1           | 0.2           |
|:--------|:------------|:--------------|:--------------|:--------------|:--------------|
| GCN     | naive       | 0.846 ± 0.005 | 0.848 ± 0.003 | 0.851 ± 0.005 | 0.857 ± 0.003 |
| GCN     | camouflaged | 0.846 ± 0.005 | 0.842 ± 0.008 | 0.840 ± 0.003 | 0.825 ± 0.009 |
| GAT     | naive       | 0.860 ± 0.020 | 0.860 ± 0.020 | 0.860 ± 0.020 | 0.860 ± 0.020 |
| GAT     | camouflaged | 0.860 ± 0.020 | 0.855 ± 0.024 | 0.855 ± 0.020 | 0.852 ± 0.027 |
| SAGE    | naive       | 0.843 ± 0.011 | 0.843 ± 0.011 | 0.845 ± 0.014 | 0.843 ± 0.011 |
| SAGE    | camouflaged | 0.843 ± 0.011 | 0.843 ± 0.011 | 0.843 ± 0.011 | 0.842 ± 0.014 |

Attack success rate (share of fake graphs caught before the attack and called REAL after it):

| model   | bot_type    | 0.0           | 0.05          | 0.1           | 0.2           |
|:--------|:------------|:--------------|:--------------|:--------------|:--------------|
| GCN     | naive       | 0.000 ± 0.000 | 0.003 ± 0.006 | 0.003 ± 0.006 | 0.007 ± 0.006 |
| GCN     | camouflaged | 0.000 ± 0.000 | 0.014 ± 0.016 | 0.020 ± 0.010 | 0.050 ± 0.026 |
| GAT     | naive       | 0.000 ± 0.000 | 0.000 ± 0.000 | 0.000 ± 0.000 | 0.000 ± 0.000 |
| GAT     | camouflaged | 0.000 ± 0.000 | 0.010 ± 0.010 | 0.010 ± 0.010 | 0.017 ± 0.021 |
| SAGE    | naive       | 0.000 ± 0.000 | 0.000 ± 0.000 | 0.000 ± 0.000 | 0.000 ± 0.000 |
| SAGE    | camouflaged | 0.000 ± 0.000 | 0.000 ± 0.000 | 0.000 ± 0.000 | 0.003 ± 0.005 |

Greedy black-box bots (optional, **seed 0 only**, 30 candidates per bot slot):

| model   |    p |   acc |    f1 |   asr |   bots_removed_by_filter |
|:--------|-----:|------:|------:|------:|-------------------------:|
| GCN     | 0.05 | 0.814 | 0.814 | 0.062 |                    0.002 |
| GCN     | 0.1  | 0.769 | 0.769 | 0.165 |                    0     |
| GCN     | 0.2  | 0.62  | 0.606 | 0.505 |                    0     |
| GAT     | 0.05 | 0.81  | 0.81  | 0.079 |                    0.001 |
| GAT     | 0.1  | 0.796 | 0.796 | 0.109 |                    0.001 |
| GAT     | 0.2  | 0.769 | 0.769 | 0.168 |                    0.002 |
| SAGE    | 0.05 | 0.824 | 0.822 | 0.038 |                    0.004 |
| SAGE    | 0.1  | 0.81  | 0.809 | 0.067 |                    0.003 |
| SAGE    | 0.2  | 0.778 | 0.778 | 0.133 |                    0.003 |

## 3. Defenses: accuracy at p = 0.10 and 0.20 (3 seeds; greedy = seed 0)


**p = 0.1**

| model   | bot_type   | attack        | attack + bot filter   | attack + adv training   | attack + filter + adv   |
|:--------|:-----------|:--------------|:----------------------|:------------------------|:------------------------|
| GCN     | naive      | 0.851 ± 0.005 | 0.846 ± 0.005         | 0.811 ± 0.038           | 0.805 ± 0.033           |
| GCN     | camo       | 0.840 ± 0.003 | 0.837 ± 0.005         | 0.799 ± 0.028           | 0.801 ± 0.030           |
| GCN     | greedy     | 0.769         | 0.760                 | 0.751                   | 0.751                   |
| GAT     | naive      | 0.860 ± 0.020 | 0.860 ± 0.020         | 0.855 ± 0.016           | 0.854 ± 0.011           |
| GAT     | camo       | 0.855 ± 0.020 | 0.855 ± 0.020         | 0.852 ± 0.011           | 0.852 ± 0.011           |
| GAT     | greedy     | 0.796         | 0.792                 | 0.801                   | 0.796                   |
| SAGE    | naive      | 0.845 ± 0.014 | 0.843 ± 0.011         | 0.849 ± 0.011           | 0.848 ± 0.011           |
| SAGE    | camo       | 0.843 ± 0.011 | 0.842 ± 0.009         | 0.849 ± 0.011           | 0.848 ± 0.009           |
| SAGE    | greedy     | 0.810         | 0.805                 | 0.814                   | 0.810                   |

**p = 0.2**

| model   | bot_type   | attack        | attack + bot filter   | attack + adv training   | attack + filter + adv   |
|:--------|:-----------|:--------------|:----------------------|:------------------------|:------------------------|
| GCN     | naive      | 0.857 ± 0.003 | 0.846 ± 0.005         | 0.811 ± 0.037           | 0.805 ± 0.033           |
| GCN     | camo       | 0.825 ± 0.009 | 0.822 ± 0.011         | 0.795 ± 0.022           | 0.795 ± 0.022           |
| GCN     | greedy     | 0.620         | 0.620                 | 0.706                   | 0.701                   |
| GAT     | naive      | 0.860 ± 0.020 | 0.860 ± 0.020         | 0.858 ± 0.011           | 0.854 ± 0.011           |
| GAT     | camo       | 0.852 ± 0.027 | 0.852 ± 0.027         | 0.854 ± 0.016           | 0.854 ± 0.016           |
| GAT     | greedy     | 0.769         | 0.769                 | 0.796                   | 0.796                   |
| SAGE    | naive      | 0.843 ± 0.011 | 0.843 ± 0.011         | 0.848 ± 0.009           | 0.848 ± 0.011           |
| SAGE    | camo       | 0.842 ± 0.014 | 0.842 ± 0.014         | 0.843 ± 0.010           | 0.843 ± 0.010           |
| SAGE    | greedy     | 0.778         | 0.778                 | 0.792                   | 0.787                   |

Clean accuracy with each defense switched on (cost of the defense when there is no attack):

| model   | condition            | acc           | f1            |
|:--------|:---------------------|:--------------|:--------------|
| GCN     | normal (clean test)  | 0.846 ± 0.005 | 0.846 ± 0.004 |
| GCN     | clean + bot filter   | 0.846 ± 0.005 | 0.846 ± 0.004 |
| GCN     | clean + adv training | 0.804 ± 0.031 | 0.801 ± 0.034 |
| GCN     | clean + filter + adv | 0.805 ± 0.033 | 0.802 ± 0.036 |
| GAT     | normal (clean test)  | 0.860 ± 0.020 | 0.859 ± 0.020 |
| GAT     | clean + bot filter   | 0.860 ± 0.020 | 0.859 ± 0.020 |
| GAT     | clean + adv training | 0.854 ± 0.011 | 0.853 ± 0.011 |
| GAT     | clean + filter + adv | 0.854 ± 0.011 | 0.853 ± 0.011 |
| SAGE    | normal (clean test)  | 0.843 ± 0.011 | 0.842 ± 0.012 |
| SAGE    | clean + bot filter   | 0.843 ± 0.011 | 0.842 ± 0.012 |
| SAGE    | clean + adv training | 0.848 ± 0.011 | 0.846 ± 0.012 |
| SAGE    | clean + filter + adv | 0.848 ± 0.011 | 0.846 ± 0.012 |

Bot filter diagnostics (thresholds learned on clean training users only):

| metric                                   |   value |
|:-----------------------------------------|--------:|
| false removal rate (train genuine users) |  0.0048 |
| false removal rate (test genuine users)  |  0.0037 |
| bots removed (naive, p=0.05)             |  1      |
| bots removed (naive, p=0.1)              |  1      |
| bots removed (naive, p=0.2)              |  1      |
| bots removed (camo, p=0.05)              |  0.0077 |
| bots removed (camo, p=0.1)               |  0.0066 |
| bots removed (camo, p=0.2)               |  0.0052 |

## 4. Explainability: share of bots among the 10 most important nodes (GNNExplainer, GCN seed 0, camouflaged bots p = 0.20, first 30 fake test graphs)

| model       |   bot_fraction (mean) |   bot_fraction (std) |   bot_fraction_root_neighbours (mean) |   bot_fraction_root_neighbours (std) |   top10_bot_share (mean) |   top10_bot_share (std) |
|:------------|----------------------:|---------------------:|--------------------------------------:|-------------------------------------:|-------------------------:|------------------------:|
| normal      |                 0.165 |                 0.01 |                                 0.305 |                                 0.16 |                    0.458 |                   0.28  |
| adv-trained |                 0.165 |                 0.01 |                                 0.305 |                                 0.16 |                    0.258 |                   0.241 |

## 5. What we found (PolitiFact)

- **Baseline.** All three GNNs reach about 84–86 % test accuracy. GAT is best at 0.860 ± 0.020. Content features (spaCy + profile) beat BERT features by 1–3 points.
- **Random bots barely fool the detector.** The worst case is GCN with 20 % camouflaged bots: accuracy goes from 0.846 to 0.825, and the attack succeeds on 5 % of the fake graphs it previously caught. GAT and SAGE move by less than 1 point.
  - Naive bots even *raise* GCN accuracy slightly (0.857). Their bot-like profiles look like fake-news spreaders.
  - Our explanation: the model max-pools user features and also sees the news (root) node directly, so a few average-looking users rarely change the decision.
- **A smarter attacker does hurt** (greedy black-box bots, seed 0 only). Each bot is chosen by querying the model. At 20 % bots:
  - GCN falls from 0.842 to 0.620 (attack success rate 50.5 %).
  - GAT falls from 0.846 to 0.769.
  - SAGE falls from 0.842 to 0.778.
  - GCN is clearly the most fragile model.
- **The bot filter works only on obvious bots.**
  - It removes 100 % of naive bots. This is partly by construction, because those bots use the same percentile signature the filter checks.
  - It removes under 1 % of camouflaged bots and under 0.5 % of greedy bots.
  - It costs almost nothing on clean data: 0.37 % of genuine test users removed, and clean accuracy unchanged.
  - It does not help against bots that copy real profiles.
- **Adversarial training is the only defense that helps against greedy bots, and it costs clean accuracy for GCN.**
  - At 20 % greedy bots (re-attacked against the defended model): GCN 0.620 → 0.706 (attack success rate 50.5 % → 13.5 %), GAT 0.769 → 0.796, SAGE 0.778 → 0.792.
  - But GCN's clean accuracy drops from 0.846 to 0.804 (3-seed mean; seed 0 alone drops 0.842 → 0.769).
  - Against random bots it brings no gain. GAT and SAGE keep their clean accuracy.
- **Explanations show the model is distracted by bots.**
  - Under 20 % camouflaged bots, bots are 45.8 % of the normal GCN's 10 most important nodes. The chance level is 30.5 %, which is the bot share among the root's direct neighbours, where all bots sit.
  - After adversarial training the share is 25.8 %, roughly chance.
  - The spread across graphs is large (std 0.24–0.28 over 30 graphs).

### What we shrank, and what didn't work

- The greedy attack is **seed 0 only**, with 30 candidates per bot slot. The full run took about 17 minutes on CPU, so 3 seeds didn't fit.
- Explanations cover GCN seed 0 on the first 30 fake test graphs, plus 3 drawn figures. In the drawn figures the attack did **not** flip the prediction: none of the small fake graphs (≤ 120 nodes) were flipped for this model.
- Random-bot attacks were too weak to show a meaningful defense effect. Defense gains on naive and camouflaged bots are within seed noise.
- The best validation epoch is usually 55–60 of 60, so the stock PyG recipe may be slightly under-trained. We kept it unchanged for comparability.
- The validation set is small (31 graphs), so model selection is noisy. This explains the GCN seed-to-seed spread after adversarial training.

