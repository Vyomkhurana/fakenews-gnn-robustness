import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { C } from '../data'
import { useDemo, type LogKind } from '../store'

const KIND: Record<LogKind, { color: string; icon: string }> = {
  run: { color: C.blue, icon: '' }, ok: { color: C.green, icon: '✓' }, warn: { color: C.amber, icon: '!' },
  bad: { color: C.coral, icon: '●' }, info: { color: C.muted, icon: '·' }, red: { color: '#ff8fa3', icon: '›' },
  blue: { color: C.green, icon: '›' },
}

export default function SystemLog() {
  const { state } = useDemo()
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }) }, [state.log])
  return (
    <div className="glass flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line/70 px-5 py-3">
        <span className="label">System log</span>
        <span className="flex items-center gap-2 text-[13px] text-muted num">
          <span className={`h-2 w-2 rounded-full ${state.running ? 'bg-green blink' : 'bg-muted/60'}`} />
          {state.running ? 'live' : 'idle'}
        </span>
      </div>
      <div ref={box} className="num min-h-0 flex-1 space-y-1.5 overflow-y-auto px-5 py-3 text-[15px] leading-snug">
        {state.log.length === 0 && <div className="text-muted">$ waiting for input<span className="blink">_</span></div>}
        <AnimatePresence initial={false}>
          {state.log.map((l) => (
            <motion.div key={l.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}
              className="flex gap-3">
              <span className="w-[46px] shrink-0 text-muted/70">{l.t.toFixed(1).padStart(4, '0')}s</span>
              <span className="w-4 shrink-0 text-center font-bold" style={{ color: KIND[l.kind].color }}>
                {l.kind === 'run' ? <span className="spin inline-block h-3.5 w-3.5 rounded-full border-2 border-blue border-t-transparent align-middle" /> : KIND[l.kind].icon}
              </span>
              <span style={{ color: l.kind === 'info' ? C.muted : l.kind === 'run' || l.kind === 'ok' ? C.ink : KIND[l.kind].color }}>{l.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
