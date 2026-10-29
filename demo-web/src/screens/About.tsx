import { motion } from 'framer-motion'
import { Card } from '../components/ui'
import { C } from '../data'

const PIPE: [string, string, string][] = [
  ['Spread graph', 'news node + users who reshared it', C.purple],
  ['GNN layer', 'GCN · GAT · GraphSAGE message passing', C.blue],
  ['Pooling', 'global max-pool + news-node features', C.blue],
  ['Classifier', 'linear layer + softmax', C.blue],
  ['Verdict', 'FAKE / REAL + P(fake)', C.coral],
]
const ADDONS: [string, string, string][] = [
  ['Bot injection attack', 'adds bots to fake-news graphs', C.coral],
  ['Bot filter', 'drops bot-like accounts before the model', C.amber],
  ['Adversarial training', 'retrains on bot-injected graphs', C.green],
  ['GNNExplainer', 'which users drove the decision', C.violet],
]
const TEAM = [['Tanisi Narwal', '23BDS0079', 'Data + base GNNs'], ['Vyom Khurana', '23BDS0081', 'Bot attack + defenses'],
  ['Abhinav Sharma', '23BDS0097', 'Explainability, charts, report']]

export default function About() {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-5">
      <Card className="p-6">
        <div className="label">Architecture</div>
        <div className="mt-4 flex items-stretch">
          {PIPE.map(([t, d, c], i) => (
            <div key={t} className="flex flex-1 items-center">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.12, duration: 0.45 }}
                className="flex-1 rounded-2xl border bg-bg/60 px-4 py-4" style={{ borderColor: `${c}77`, boxShadow: `0 0 30px -14px ${c}` }}>
                <div className="text-[18px] font-bold" style={{ color: c }}>{t}</div>
                <div className="mt-1 text-[15px] leading-snug text-muted">{d}</div>
              </motion.div>
              {i < PIPE.length - 1 && (
                <svg width="46" height="20" className="shrink-0">
                  <line x1="4" y1="10" x2="38" y2="10" stroke={C.muted} strokeWidth="2.5" strokeDasharray="5 4" className="march" />
                  <path d="M36 4 L44 10 L36 16" fill="none" stroke={C.muted} strokeWidth="2.5" />
                </svg>
              )}
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-4 gap-4">
          {ADDONS.map(([t, d, c], i) => (
            <motion.div key={t} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 + i * 0.1, duration: 0.45 }}
              className="rounded-2xl border border-dashed px-4 py-3" style={{ borderColor: `${c}99`, background: `${c}10` }}>
              <div className="text-[17px] font-semibold" style={{ color: c }}>+ {t}</div>
              <div className="text-[15px] text-muted">{d}</div>
            </motion.div>
          ))}
        </div>
      </Card>
      <div className="grid min-h-0 grid-cols-[1fr_1.3fr_1fr] gap-5">
        <Card delay={0.2} className="p-6">
          <div className="label">Team · VIT Vellore</div>
          <div className="mt-4 space-y-4">
            {TEAM.map(([name, reg, role], i) => (
              <div key={name} className="flex items-center gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[18px] font-bold text-bg"
                  style={{ background: [C.blue, C.green, C.amber][i] }}>{name.split(' ').map((w) => w[0]).join('')}</div>
                <div>
                  <div className="text-[18px] font-semibold">{name} <span className="num text-[14px] text-muted">{reg}</span></div>
                  <div className="text-[15px] text-muted">{role}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card delay={0.3} className="overflow-y-auto p-6">
          <div className="label">Built on</div>
          <ul className="mt-3 space-y-2 text-[16px] leading-snug">
            <li><span className="font-semibold">GNN-FakeNews / UPFD</span> <span className="text-muted">— Dou et al., SIGIR 2021 (dataset + base code)</span></li>
            <li><span className="font-semibold">PyTorch Geometric</span> <span className="text-muted">— UPFD loader, GNNExplainer</span></li>
          </ul>
          <div className="label mt-4">Related work</div>
          <ul className="mt-3 space-y-2 text-[16px] leading-snug text-muted">
            <li><span className="text-ink">Wang et al., WWW 2023</span> — attacks via fake social engagement</li>
            <li><span className="text-ink">Zhu et al., GAFSI 2024</span> — black-box attack on graph detectors</li>
          </ul>
        </Card>
        <Card delay={0.4} className="flex flex-col p-6">
          <div className="label">Code & results</div>
          <div className="num mt-4 text-[17px] text-blue">github.com/Vyomkhurana/<wbr />fakenews-gnn-robustness</div>
          <p className="mt-4 text-[16px] leading-relaxed text-muted">
            Every number in this demo is read from the project's saved outputs (results/*.csv and demo_cache.pt). The demo replays saved test stories offline.
          </p>
        </Card>
      </div>
    </div>
  )
}
