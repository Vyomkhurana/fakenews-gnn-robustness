# Results summary (Gossipcop, all numbers produced by src/run_all.py)

## 1. Baseline detectors (test set, 3 seeds, mean ± std, macro P/R/F1)

| feature   | model   | acc           | precision     | recall        | f1            |
|:----------|:--------|:--------------|:--------------|:--------------|:--------------|
| content   | GCN     | 0.956 ± 0.001 | 0.956 ± 0.001 | 0.956 ± 0.001 | 0.956 ± 0.001 |
| content   | GAT     | 0.974 ± 0.002 | 0.974 ± 0.002 | 0.974 ± 0.002 | 0.974 ± 0.002 |
| content   | SAGE    | 0.975 ± 0.001 | 0.975 ± 0.001 | 0.975 ± 0.001 | 0.975 ± 0.001 |
| bert      | GCN     | 0.956 ± 0.002 | 0.956 ± 0.002 | 0.956 ± 0.002 | 0.956 ± 0.002 |
| bert      | GAT     | 0.968 ± 0.002 | 0.968 ± 0.002 | 0.968 ± 0.002 | 0.968 ± 0.002 |
| bert      | SAGE    | 0.972 ± 0.000 | 0.972 ± 0.000 | 0.972 ± 0.000 | 0.972 ± 0.000 |

## 2. Bot injection attack: test accuracy vs bot budget p (only FAKE test graphs attacked; 3 seeds)

| model   | bot_type    | 0.0           | 0.05          | 0.1           | 0.2           |
|:--------|:------------|:--------------|:--------------|:--------------|:--------------|
| GCN     | naive       | 0.956 ± 0.001 | 0.949 ± 0.001 | 0.940 ± 0.002 | 0.908 ± 0.005 |
| GCN     | camouflaged | 0.956 ± 0.001 | 0.950 ± 0.001 | 0.944 ± 0.001 | 0.925 ± 0.001 |
| GAT     | naive       | 0.974 ± 0.002 | 0.963 ± 0.004 | 0.953 ± 0.007 | 0.938 ± 0.011 |
| GAT     | camouflaged | 0.974 ± 0.002 | 0.952 ± 0.005 | 0.936 ± 0.008 | 0.901 ± 0.009 |
| SAGE    | naive       | 0.975 ± 0.001 | 0.963 ± 0.007 | 0.948 ± 0.013 | 0.923 ± 0.021 |
| SAGE    | camouflaged | 0.975 ± 0.001 | 0.957 ± 0.006 | 0.936 ± 0.016 | 0.896 ± 0.025 |

Attack success rate (share of fake graphs caught before the attack and called REAL after it):

| model   | bot_type    | 0.0           | 0.05          | 0.1           | 0.2           |
|:--------|:------------|:--------------|:--------------|:--------------|:--------------|
| GCN     | naive       | 0.000 ± 0.000 | 0.014 ± 0.004 | 0.033 ± 0.004 | 0.100 ± 0.011 |
| GCN     | camouflaged | 0.000 ± 0.000 | 0.011 ± 0.003 | 0.024 ± 0.002 | 0.064 ± 0.004 |
| GAT     | naive       | 0.000 ± 0.000 | 0.022 ± 0.006 | 0.042 ± 0.011 | 0.073 ± 0.019 |
| GAT     | camouflaged | 0.000 ± 0.000 | 0.045 ± 0.007 | 0.078 ± 0.014 | 0.149 ± 0.016 |
| SAGE    | naive       | 0.000 ± 0.000 | 0.025 ± 0.014 | 0.056 ± 0.025 | 0.108 ± 0.043 |
| SAGE    | camouflaged | 0.000 ± 0.000 | 0.038 ± 0.011 | 0.080 ± 0.031 | 0.163 ± 0.051 |

## 3. Defenses: accuracy at p = 0.10 and 0.20 (3 seeds; greedy = seed 0)


**p = 0.1**

| model   | bot_type   | attack        | attack + bot filter   | attack + adv training   | attack + filter + adv   |
|:--------|:-----------|:--------------|:----------------------|:------------------------|:------------------------|
| GCN     | naive      | 0.940 ± 0.002 | 0.956 ± 0.000         | 0.941 ± 0.002           | 0.955 ± 0.002           |
| GCN     | camo       | 0.944 ± 0.001 | 0.944 ± 0.001         | 0.945 ± 0.002           | 0.945 ± 0.003           |
| GAT     | naive      | 0.953 ± 0.007 | 0.974 ± 0.002         | 0.969 ± 0.003           | 0.974 ± 0.001           |
| GAT     | camo       | 0.936 ± 0.008 | 0.936 ± 0.008         | 0.947 ± 0.008           | 0.947 ± 0.008           |
| SAGE    | naive      | 0.948 ± 0.013 | 0.975 ± 0.001         | 0.967 ± 0.002           | 0.976 ± 0.001           |
| SAGE    | camo       | 0.936 ± 0.016 | 0.937 ± 0.015         | 0.954 ± 0.004           | 0.954 ± 0.003           |

**p = 0.2**

| model   | bot_type   | attack        | attack + bot filter   | attack + adv training   | attack + filter + adv   |
|:--------|:-----------|:--------------|:----------------------|:------------------------|:------------------------|
| GCN     | naive      | 0.908 ± 0.005 | 0.956 ± 0.000         | 0.916 ± 0.005           | 0.955 ± 0.002           |
| GCN     | camo       | 0.925 ± 0.001 | 0.926 ± 0.002         | 0.929 ± 0.004           | 0.929 ± 0.004           |
| GAT     | naive      | 0.938 ± 0.011 | 0.974 ± 0.002         | 0.966 ± 0.005           | 0.974 ± 0.001           |
| GAT     | camo       | 0.901 ± 0.009 | 0.901 ± 0.009         | 0.923 ± 0.007           | 0.923 ± 0.007           |
| SAGE    | naive      | 0.923 ± 0.021 | 0.975 ± 0.001         | 0.959 ± 0.006           | 0.976 ± 0.001           |
| SAGE    | camo       | 0.896 ± 0.025 | 0.896 ± 0.025         | 0.931 ± 0.006           | 0.931 ± 0.006           |

Clean accuracy with each defense switched on (cost of the defense when there is no attack):

| model   | condition            | acc           | f1            |
|:--------|:---------------------|:--------------|:--------------|
| GCN     | normal (clean test)  | 0.956 ± 0.001 | 0.956 ± 0.001 |
| GCN     | clean + bot filter   | 0.956 ± 0.000 | 0.956 ± 0.000 |
| GCN     | clean + adv training | 0.955 ± 0.001 | 0.955 ± 0.001 |
| GCN     | clean + filter + adv | 0.955 ± 0.002 | 0.955 ± 0.002 |
| GAT     | normal (clean test)  | 0.974 ± 0.002 | 0.974 ± 0.002 |
| GAT     | clean + bot filter   | 0.974 ± 0.002 | 0.974 ± 0.002 |
| GAT     | clean + adv training | 0.974 ± 0.001 | 0.974 ± 0.001 |
| GAT     | clean + filter + adv | 0.974 ± 0.001 | 0.974 ± 0.001 |
| SAGE    | normal (clean test)  | 0.975 ± 0.001 | 0.975 ± 0.001 |
| SAGE    | clean + bot filter   | 0.975 ± 0.001 | 0.975 ± 0.001 |
| SAGE    | clean + adv training | 0.976 ± 0.001 | 0.976 ± 0.001 |
| SAGE    | clean + filter + adv | 0.976 ± 0.001 | 0.976 ± 0.001 |

Bot filter diagnostics (thresholds learned on clean training users only):

| metric                                   |   value |
|:-----------------------------------------|--------:|
| false removal rate (train genuine users) |  0.0044 |
| false removal rate (test genuine users)  |  0.0049 |
| bots removed (naive, p=0.05)             |  1      |
| bots removed (naive, p=0.1)              |  1      |
| bots removed (naive, p=0.2)              |  1      |
| bots removed (camo, p=0.05)              |  0.0137 |
| bots removed (camo, p=0.1)               |  0.0155 |
| bots removed (camo, p=0.2)               |  0.0146 |

## 5. What we found (GossipCop: P0–P2 only; no greedy attack and no explanation figures, for lack of time)

- **Baseline.** On the larger GossipCop dataset (train 1092 / val 546 / test 3826), all models reach 95.6–97.5 % accuracy. SAGE (0.975 ± 0.001) and GAT (0.974 ± 0.002) beat GCN (0.956 ± 0.001).
- **Random bots hurt more here than on PolitiFact.** At 20 % camouflaged bots:
  - SAGE drops from 0.975 to 0.896 (attack success rate 16.3 %).
  - GAT drops from 0.974 to 0.901 (14.9 %).
  - GCN drops from 0.956 to 0.925 (6.4 %).
  - Naive bots also hurt (GCN 0.908, SAGE 0.923 at 20 %).
- **Bot filter.** It removes 100 % of naive bots (by construction) and fully restores clean accuracy against them. It removes only 1.4–1.5 % of camouflaged bots and gives no gain against them. It wrongly removes 0.49 % of genuine test users, with no clean-accuracy cost.
- **Adversarial training helps with no clean-accuracy cost.** At 20 % camouflaged bots: SAGE 0.896 → 0.931, GAT 0.901 → 0.923, GCN 0.925 → 0.929. Clean accuracy is unchanged (e.g. SAGE 0.976). It does not fully close the gap to clean.
- **Filter + adversarial training** gives the best overall robustness: no loss against naive bots, and the adversarial-training gain against camouflaged bots.

