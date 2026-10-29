import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { C, stories } from '../data'
import { pFor, useDemo, verdictOf } from '../store'
import { useGraphView } from './SpreadGraph'

export function Gauge({ p }: { p: number | null }) {
  const v = useSpring(p ?? 0.5, { stiffness: 70, damping: 13 })
  useEffect(() => { v.set(p ?? 0.5) }, [p, v])
  const W = 320, cx = 160, cy = 165, r = 130
  const nx = useTransform(v, (x) => cx + (r - 30) * Math.cos(Math.PI * (1 - x)))
  const ny = useTransform(v, (x) => cy - (r - 30) * Math.sin(Math.PI * (1 - x)))
  const arc = (a0: number, a1: number) => {
    const pt = (a: number) => `${cx + r * Math.cos(Math.PI * (1 - a))} ${cy - r * Math.sin(Math.PI * (1 - a))}`
    return `M${pt(a0)} A${r} ${r} 0 0 1 ${pt(a1)}`
  }
  return (
    <svg viewBox={`0 0 ${W} 200`} className="h-full w-full">
      <defs>
        <linearGradient id="gaugeGrad" x1="0" x2="1">
          <stop offset="0%" stopColor={C.green} /><stop offset="50%" stopColor={C.amber} /><stop offset="100%" stopColor={C.coral} />
        </linearGradient>
      </defs>
      <path d={arc(0, 1)} stroke="#1f2947" strokeWidth={22} fill="none" strokeLinecap="round" />
      <path d={arc(0, 1)} stroke="url(#gaugeGrad)" strokeWidth={22} fill="none" strokeLinecap="round" opacity={p === null ? 0.25 : 0.9} />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const a = Math.PI * (1 - t)
        return <line key={t} x1={cx + (r - 22) * Math.cos(a)} y1={cy - (r - 22) * Math.sin(a)} x2={cx + (r - 32) * Math.cos(a)}
          y2={cy - (r - 32) * Math.sin(a)} stroke={t === 0.5 ? C.ink : C.muted} strokeWidth={t === 0.5 ? 3 : 2} />
      })}
      <line x1={cx} y1={cy - r - 9} x2={cx} y2={cy - r + 14} stroke={C.ink} strokeWidth={2} strokeDasharray="4 3" />
      <text x={cx} y={18} textAnchor="middle" fill={C.muted} fontSize={17} fontFamily="JetBrains Mono">decision line 0.5</text>
      <text x={14} y={197} fill={C.green} fontSize={18} fontWeight={700} fontFamily="JetBrains Mono">REAL</text>
      <text x={W - 14} y={197} textAnchor="end" fill={C.coral} fontSize={18} fontWeight={700} fontFamily="JetBrains Mono">FAKE</text>
      <motion.line x1={cx} y1={cy} x2={nx} y2={ny} stroke={p === null ? C.muted : C.ink} strokeWidth={5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={11} fill={C.card} stroke={C.ink} strokeWidth={3} />
    </svg>
  )
}

function Num({ p }: { p: number }) {
  const v = useSpring(p, { stiffness: 70, damping: 15 })
  useEffect(() => { v.set(p) }, [p, v])
  const t = useTransform(v, (x) => x.toFixed(3))
  return <motion.span className="num">{t}</motion.span>
}

export default function VerdictCard({ compact = false }: { compact?: boolean }) {
  const { state } = useDemo()
  const { advModel } = useGraphView()
  const s = stories[state.story]
  const { phase, running } = state
  const p = pFor(state.story, phase)
  const label = p === null ? null : verdictOf(p)
  const setting = ['Waiting for a story', 'Clean spread', `+${s.k} smart bots (20%)`, `+${s.k} smart bots · bot filter on`,
    `+${s.k} bots re-crafted against this model`][phase]
  const status: [string, string] = running === 'analyze' ? ['Analysing the spread…', C.blue]
    : running === 'attack' ? ['Attack in progress…', C.coral]
      : running === 'filter' ? ['Scanning accounts…', C.amber]
        : running === 'adv' ? ['Re-scoring with the hardened model…', C.green]
          : ([['Pick a story to analyse', C.muted], ['Flagged as fake news', C.coral], ['Detector fooled', C.coral],
            ['Filter found nothing — still fooled', C.amber], ['Detected again', C.green]] as [string, string][])[phase]

  return (
    <div className={`glass flex flex-col ${compact ? 'gap-2 p-5' : 'gap-3 p-6'}`}>
      <div className="flex items-center justify-between">
        <span className="label">Verdict</span>
        <AnimatePresence mode="wait">
          <motion.span key={advModel ? 'adv' : 'std'} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }} className="num rounded-full px-3 py-1 text-[15px] font-semibold"
            style={{ background: advModel ? 'rgba(46,230,168,.14)' : 'rgba(123,150,255,.14)', color: advModel ? C.green : C.blue,
              border: `1px solid ${advModel ? 'rgba(46,230,168,.4)' : 'rgba(123,150,255,.35)'}` }}>
            {advModel ? 'GCN · adv-trained' : 'GCN'}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="h-6 truncate text-[16px] text-muted">{setting}</div>
      <div className={`mx-auto w-full max-w-[330px] ${compact ? 'h-[clamp(96px,15vh,200px)]' : 'h-[clamp(110px,19vh,200px)]'}`}><Gauge p={running === 'analyze' ? null : p} /></div>
      <div className="flex h-[64px] items-center justify-between gap-3">
        <AnimatePresence mode="wait">
          {label && running !== 'analyze' ? (
            <motion.div key={label} initial={{ rotateX: 90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} exit={{ rotateX: -90, opacity: 0 }}
              transition={{ duration: 0.35 }} className="rounded-xl px-5 py-1.5 text-[38px] font-extrabold tracking-wide"
              style={{ color: label === 'FAKE' ? C.coral : C.green, background: label === 'FAKE' ? 'rgba(255,77,109,.12)' : 'rgba(46,230,168,.12)',
                boxShadow: `0 0 36px -8px ${label === 'FAKE' ? C.coral : C.green}` }}>
              {label}
            </motion.div>
          ) : (
            <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-[22px] font-semibold text-muted">{running === 'analyze' ? 'Scoring…' : '—'}</motion.div>
          )}
        </AnimatePresence>
        <div className="text-right">
          <div className="label">P(fake)</div>
          <div className="text-[30px] font-bold">{p !== null && running !== 'analyze' ? <Num p={p} /> : <span className="num text-muted">—.———</span>}</div>
        </div>
      </div>
      <div className="flex h-8 items-center justify-between">
        <AnimatePresence mode="wait">
          <motion.div key={status[0]} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.25 }} className="flex items-center gap-2 text-[18px] font-semibold" style={{ color: status[1] }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: status[1], boxShadow: `0 0 12px ${status[1]}` }} />
            {status[0]}
          </motion.div>
        </AnimatePresence>
        {p !== null && Math.abs(p - 0.5) < 0.1 && running !== 'analyze' && (
          <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="num rounded-full border border-amber/50 bg-amber/10 px-3 py-0.5 text-[14px] font-semibold text-amber"
            title="P(fake) is within 0.1 of the 0.5 decision line">Close call</motion.span>
        )}
      </div>
      {!compact && <div className="text-[15px] text-muted">Ground truth: <span className="font-semibold text-coral">FAKE</span> (PolitiFact)</div>}
    </div>
  )
}
