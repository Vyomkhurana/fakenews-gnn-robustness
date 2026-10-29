import { AnimatePresence, motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import SpreadGraph, { topTen, useGraphView } from '../components/SpreadGraph'
import SystemLog from '../components/SystemLog'
import { Btn } from '../components/ui'
import VerdictCard from '../components/VerdictCard'
import { C, f3, pct, results, stories, storyTitle } from '../data'
import { useDemo, type Phase } from '../store'

export default function Lab() {
  const { state } = useDemo()
  return (
    <div className="grid h-full min-h-0 grid-cols-[clamp(270px,21vw,360px)_minmax(0,1fr)_clamp(300px,23vw,400px)] gap-5">
      <div className="min-h-0 overflow-y-auto pr-1">
        <AnimatePresence mode="wait">
          <motion.div key={state.tab} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: 'easeOut' }} className="flex flex-col gap-4">
            {state.tab === 'analyze' && <AnalyzePanel />}
            {state.tab === 'attack' && <AttackPanel />}
            {state.tab === 'defend' && <DefendPanel />}
            {state.tab === 'explain' && <ExplainPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
      <GraphCard />
      <div className="flex min-h-0 flex-col gap-4">
        <VerdictCard compact={state.tab === 'explain'} />
        {state.tab === 'explain' ? <AggregateCard /> : <SystemLog />}
      </div>
    </div>
  )
}

function Panel({ title, kicker, color, children }: { title: string; kicker: string; color: string; children: ReactNode }) {
  return (
    <div className="glass p-5">
      <div className="label" style={{ color }}>{kicker}</div>
      <div className="mt-1 text-[22px] font-bold">{title}</div>
      <div className="mt-3 space-y-4">{children}</div>
    </div>
  )
}

function AnalyzePanel() {
  const { state, actions } = useDemo()
  const [text, setText] = useState('')
  return (
    <>
      <Panel kicker="New analysis" title="Check a news story" color={C.blue}>
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a tweet or news link"
            onKeyDown={(e) => e.key === 'Enter' && actions.analyze(0)}
            className="min-w-0 flex-1 rounded-xl border border-line bg-bg/70 px-4 py-3 text-[16px] text-ink placeholder:text-muted/70" />
        </div>
        <Btn color={C.blue} onClick={() => actions.analyze(text ? 0 : state.story)} disabled={!!state.running}>Analyse spread</Btn>
        <div className="flex items-center gap-2 text-[14px] text-muted">
          <span className="h-2 w-2 rounded-full bg-amber" /> Demo mode: replays saved test stories
        </div>
      </Panel>
      <div className="label px-1">Saved PolitiFact test stories</div>
      {stories.map((s, i) => (
        <motion.button key={i} onClick={() => actions.analyze(i)} disabled={!!state.running}
          whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="glass block w-full p-4 text-left disabled:cursor-not-allowed"
          style={{ borderColor: state.story === i ? 'rgba(123,150,255,.7)' : undefined,
            boxShadow: state.story === i ? '0 0 30px -10px rgba(123,150,255,.8)' : undefined }}>
          <div className="num text-[13px] text-muted">STORY {i + 1} · #{s.testIndex}</div>
          <div className="mt-1 line-clamp-2 text-[16px] font-semibold leading-snug">{storyTitle(s)}</div>
          <div className="num mt-2 text-[14px] text-muted">{s.users} users · {s.edgeCount} reshares · depth {s.maxDepth}</div>
        </motion.button>
      ))}
    </>
  )
}

function AttackPanel() {
  const { state, actions } = useDemo()
  const s = stories[state.story]
  const done = state.phase >= 2
  return (
    <Panel kicker="Red team" title="Bot injection attack" color={C.coral}>
      <p className="text-[16px] leading-relaxed text-muted">
        The attacker adds bots that clone real users who share <span className="text-ink">real</span> news, and makes each bot reshare
        the story straight from the source.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {[['Budget', '20%'], ['Bots', String(s.k)], ['Method', 'greedy']].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line bg-bg/50 px-3 py-2">
            <div className="text-[13px] text-muted">{k}</div><div className="num text-[18px] font-bold">{v}</div>
          </div>
        ))}
      </div>
      <Btn big color={C.coral} disabled={!!state.running} onClick={() => (done ? (actions.jump(1), setTimeout(actions.attack, 60)) : actions.attack())}>
        {done ? '↻ Replay attack' : '⚡ Inject 20% smart bots'}
      </Btn>
      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl border border-coral/40 bg-coral/10 p-4">
            <div className="text-[18px] font-bold text-coral">Detector fooled</div>
            <div className="num mt-1 whitespace-nowrap text-[16px]">P(fake) {f3(s.p[0])} → {f3(s.p[1])}</div>
            <div className="mt-1 text-[15px] text-muted">Across all {results.datasets.politifact.test} test stories, these bots cut GCN accuracy from{' '}
              <span className="num text-ink">{f3(results.defense20.GCN.clean)}</span> to <span className="num text-coral">{f3(results.defense20.GCN.attack)}</span>.</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  )
}

function DefendPanel() {
  const { state, actions } = useDemo()
  const s = stories[state.story]
  const attacked = state.phase >= 2
  return (
    <Panel kicker="Blue team" title="Defend the detector" color={C.green}>
      {!attacked && (
        <div className="rounded-xl border border-line bg-bg/50 p-4 text-[16px] text-muted">
          Launch the bot attack first.
          <div className="mt-3"><Btn color={C.coral} onClick={() => actions.attack()} disabled={!!state.running}>Go to attack</Btn></div>
        </div>
      )}
      <div className="space-y-2">
        <div className="text-[17px] font-semibold" style={{ color: C.amber }}>1 · Rule-based bot filter</div>
        <p className="text-[15px] text-muted">Removes accounts that are brand-new, with almost no followers and almost no posts.</p>
        <Btn color={C.amber} disabled={!attacked || !!state.running} onClick={() => actions.filter()}>Run bot filter</Btn>
        <AnimatePresence>
          {state.phase === 3 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border border-amber/40 bg-amber/10 p-3 text-[16px]">
              <span className="num font-bold text-amber">{s.filter.flagged} of {s.filter.checked}</span> accounts flagged — bots copy real profiles
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="space-y-2">
        <div className="text-[17px] font-semibold text-green">2 · Adversarial training</div>
        <p className="text-[15px] text-muted">A GCN retrained with bots injected into half of the fake training stories every epoch.</p>
        <Btn color={C.green} disabled={!attacked || !!state.running} onClick={() => actions.adv()}>Switch to adversarially trained model</Btn>
        <AnimatePresence>
          {state.phase === 4 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border border-green/40 bg-green/10 p-3">
              <div className="text-[18px] font-bold text-green">Detected again</div>
              <div className="text-[15px] text-muted">Attacker re-crafted bots against this model too (adaptive attack).</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Panel>
  )
}

function ExplainPanel() {
  const { state, actions } = useDemo()
  const { s, step, visible } = useGraphView()
  const top = state.phase >= 1 ? topTen(s.importance[step], visible) : []
  const botsInTop = top.filter((id) => id >= s.n).length
  const views: [string, Phase][] = [['Clean', 1], ['Attacked', 2], ['Defended', 4]]
  return (
    <Panel kicker="Explain" title="Why this verdict?" color={C.amber}>
      <button onClick={() => actions.set({ explain: !state.explain })} disabled={state.phase === 0}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-bg/50 px-4 py-3 text-[16px] disabled:opacity-40">
        <span>GNNExplainer importance</span>
        <span className="relative h-7 w-12 rounded-full transition-colors" style={{ background: state.explain ? C.amber : '#263055' }}>
          <motion.span layout className="absolute top-1 h-5 w-5 rounded-full bg-white" style={{ left: state.explain ? 24 : 4 }} />
        </span>
      </button>
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-bg/50 p-1">
        {views.map(([name, ph]) => (
          <button key={name} disabled={!!state.running} onClick={() => actions.jump(ph, { tab: 'explain', explain: true })}
            className="relative rounded-lg px-2 py-2 text-[15px] font-semibold">
            {state.phase === ph && <motion.span layoutId="viewpill" className="absolute inset-0 rounded-lg bg-card2" />}
            <span className="relative" style={{ color: state.phase === ph ? C.ink : C.muted }}>{name}</span>
          </button>
        ))}
      </div>
      {state.phase === 0 ? <div className="text-[16px] text-muted">Run an analysis first.</div> : state.explain && (
        <>
          <div className="flex items-baseline justify-between">
            <span className="text-[16px] text-muted">Bots in top-10</span>
            <span className="num text-[26px] font-bold" style={{ color: botsInTop ? C.coral : C.green }}>{Math.round((100 * botsInTop) / Math.max(top.length, 1))}%</span>
          </div>
          <div className="space-y-1.5 [@media(max-height:900px)]:space-y-1">
            {top.map((id, i) => {
              const n = s.nodes[id], v = s.importance[step][id]
              return (
                <motion.div key={`${step}-${id}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-2 text-[15px]">
                  <span className="num w-6 text-right font-bold text-amber">{i + 1}</span>
                  <span className="num w-[104px] truncate">{n.handle}</span>
                  <span className="w-11 rounded px-1 text-center text-[13px] font-semibold"
                    style={{ background: n.type === 'bot' ? 'rgba(255,77,109,.18)' : 'rgba(123,150,255,.16)', color: n.type === 'bot' ? C.coral : C.blue }}>
                    {n.type}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
                    <motion.span className="block h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${v * 100}%` }}
                      transition={{ duration: 0.5, delay: i * 0.04 }} style={{ background: n.type === 'bot' ? C.coral : C.blue }} />
                  </span>
                </motion.div>
              )
            })}
          </div>
        </>
      )}
    </Panel>
  )
}

function AggregateCard() {
  const e = results.explainTop10
  const rows: [string, number, string][] = [['Normal GCN', e.normal, C.coral], ['Random chance', e.chance, C.muted], ['Adv-trained GCN', e.adv, C.green]]
  return (
    <div className="glass flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-5 [@media(max-height:900px)]:gap-2 [@media(max-height:900px)]:p-4">
      <div className="label">Bots in top-10 · {e.graphs} stories</div>
      <div className="text-[16px] leading-snug [@media(max-height:900px)]:hidden">Under attack the normal GCN leans on bots more than chance; adversarial training removes that.</div>
      {rows.map(([name, v, c], i) => (
        <div key={name} className="[@media(min-height:901px)]:mt-2">
          <div className="flex justify-between text-[16px]"><span>{name}</span><span className="num font-bold" style={{ color: c }}>{pct(v)}</span></div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-bg [@media(min-height:901px)]:h-4">
            <motion.div className="h-full rounded-full" style={{ background: c }} initial={{ width: 0 }} animate={{ width: `${v * 100 / 0.6}%` }}
              transition={{ duration: 0.9, delay: 0.15 * i, ease: [0.16, 1, 0.3, 1] }} />
          </div>
        </div>
      ))}
      <div className="mt-auto text-[14px] leading-snug text-muted">GCN seed 0 · 20% camouflaged bots · chance = bot share among direct sharers</div>
    </div>
  )
}

function GraphCard() {
  const { state } = useDemo()
  const { s, botCount } = useGraphView()
  const idle = state.phase === 0 && !state.running
  const mode = state.running === 'filter' || state.phase === 3 ? ['FILTER ON', C.amber]
    : state.phase === 4 || state.running === 'adv' ? ['ADV MODEL', C.green]
      : botCount > 0 ? ['UNDER ATTACK', C.coral] : state.phase >= 1 || state.running ? ['CLEAN', C.blue] : null
  return (
    <div className="glass relative min-h-0 overflow-hidden">
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 bg-gradient-to-b from-card via-card/80 to-transparent px-6 pb-8 pt-5">
        <div className="min-w-0">
          <div className="num truncate text-[14px] text-muted">POLITIFACT · STORY #{s.testIndex}{s.newsId ? ` · ${s.newsId}` : ''}</div>
          <div className="mt-1 line-clamp-2 text-[clamp(18px,1.15vw,21px)] font-semibold leading-snug [@media(max-height:900px)]:line-clamp-1">{storyTitle(s)}</div>
          <div className="num mt-2 flex flex-wrap gap-2 text-[14px]">
            {[[`${s.users} users`, C.blue], [`${s.edgeCount} reshares`, C.muted], botCount ? [`${botCount} bots`, C.coral] : null]
              .filter((x): x is string[] => !!x).map(([t, c]) => (
                <span key={t} className="rounded-full border border-line bg-bg/60 px-2.5 py-0.5" style={{ color: c }}>{t}</span>
              ))}
          </div>
        </div>
        <AnimatePresence mode="wait">
          {mode && (
            <motion.span key={mode[0]} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              className="num shrink-0 rounded-lg px-3 py-1.5 text-[15px] font-bold"
              style={{ color: mode[1], background: `${mode[1]}1f`, border: `1px solid ${mode[1]}66` }}>{mode[0]}</motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="absolute inset-0 px-4 pb-14 pt-32 [@media(max-height:900px)]:pt-28"><SpreadGraph /></div>
      <AnimatePresence>
        {idle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2.4, repeat: Infinity }}
              className="h-16 w-16 rounded-full" style={{ background: 'radial-gradient(circle, #9d90ff, #6C5CE7)', boxShadow: '0 0 50px #6C5CE7' }} />
            <div className="text-[22px] font-semibold">Pick a story or paste a link</div>
            <div className="text-[16px] text-muted">SpreadShield rebuilds the reshare cascade and scores it.</div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-5 px-6 pb-4 text-[15px] text-muted">
        {[['News', C.purple], ['Real users', C.blue], ['Bots', C.coral]].map(([t, c]) => (
          <span key={t} className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: c, boxShadow: `0 0 10px ${c}` }} />{t}</span>
        ))}
        {state.explain && state.phase >= 1 && <span className="flex items-center gap-2 text-amber"><span className="h-3 w-3 rounded-full border-2 border-amber" />Top-10 important</span>}
        <span className="ml-auto num text-[14px]">hover a node for details</span>
      </div>
    </div>
  )
}
