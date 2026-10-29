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
