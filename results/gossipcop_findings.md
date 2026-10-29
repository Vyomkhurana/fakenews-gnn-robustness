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
