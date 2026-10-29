import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { Background } from './components/ui'
import { C, stories } from './data'
import About from './screens/About'
import Hero from './screens/Hero'
import Lab from './screens/Lab'
import Results from './screens/Results'
import { LAB_TABS, TABS, useDemo } from './store'

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="34" height="34" viewBox="0 0 32 32">
        <path d="M16 2 4 7v8c0 7.5 5.1 13.4 12 15 6.9-1.6 12-7.5 12-15V7z" fill="#141B2F" stroke={C.green} strokeWidth="2" />
        <circle cx="16" cy="15" r="3.2" fill={C.purple} /><circle cx="10" cy="11" r="1.8" fill={C.blue} />
        <circle cx="22" cy="11" r="1.8" fill={C.blue} /><circle cx="11" cy="21" r="1.8" fill={C.coral} /><circle cx="21" cy="21" r="1.8" fill={C.blue} />
      </svg>
      <span className="text-[21px] font-extrabold tracking-tight">SpreadShield</span>
    </div>
  )
}

function TopBar() {
  const { state, actions } = useDemo()
  return (
    <div className="flex h-[68px] items-center gap-6 px-6">
      <Logo />
      <nav className="flex gap-1 rounded-2xl border border-line/70 bg-card/60 p-1">
        {TABS.map((t) => {
          const active = state.tab === t.id
          return (
            <button key={t.id} onClick={() => actions.setTab(t.id)} className="relative rounded-xl px-3.5 py-2 text-[16px] font-semibold">
              {active && <motion.span layoutId="tabpill" className="absolute inset-0 rounded-xl bg-card2"
                style={{ boxShadow: '0 0 24px -8px rgba(123,150,255,.7)', border: '1px solid rgba(123,150,255,.35)' }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
              <span className="relative" style={{ color: active ? C.ink : C.muted }}>{t.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <select value={state.story} onChange={(e) => actions.setStory(Number(e.target.value))} aria-label="Story"
          className="num rounded-xl border border-line bg-card px-3 py-2 text-[15px] text-ink">
          {stories.map((s, i) => <option key={i} value={i}>Story {i + 1} · #{s.testIndex}</option>)}
        </select>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => (state.tour.active ? actions.togglePause() : actions.tour())}
          className="rounded-xl px-4 py-2 text-[16px] font-bold text-bg"
          style={{ background: state.tour.active ? C.amber : 'linear-gradient(90deg,#7B96FF,#2EE6A8)' }}>
          {state.tour.active ? (state.tour.paused ? '▶ Resume' : '❚❚ Pause') : '▶ Guided tour'}
        </motion.button>
      </div>
    </div>
  )
}

function BottomBar() {
  const { state } = useDemo()
  const caption = state.tour.active || state.tour.done ? state.tour.caption : ''
  return (
    <div className="flex h-[64px] items-center justify-center px-6">
      <AnimatePresence mode="wait">
        {caption ? (
          <motion.div key={caption} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }} className="glass flex max-w-[1400px] items-center gap-4 px-6 py-2.5">
            {state.tour.active && <span className={`h-3 w-3 shrink-0 rounded-full ${state.tour.paused ? 'bg-amber' : 'bg-green blink'}`} />}
            <span className="text-[clamp(17px,1.35vw,22px)] font-medium leading-snug">{caption}</span>
            {state.tour.paused && <span className="num shrink-0 text-[14px] text-amber">PAUSED · space</span>}
          </motion.div>
        ) : (
          <motion.div key="hints" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="num flex flex-wrap justify-center gap-x-5 text-[14px] text-muted">
            {[['→ ←', 'step'], ['1–3', 'story'], ['T', 'tour'], ['Space', 'pause'], ['R', 'reset'], ['F', 'fullscreen'], ['D', 'dashboard']].map(([k, v]) => (
              <span key={k}><span className="rounded border border-line bg-card px-1.5 py-0.5 text-ink">{k}</span> {v}</span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  const { state, actions } = useDemo()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'arrowright') actions.go(1)
      else if (k === 'arrowleft') actions.go(-1)
      else if (['1', '2', '3'].includes(k)) actions.setStory(Number(k) - 1)
      else if (k === 'r') actions.reset()
      else if (k === 'f') actions.set((s) => ({ fullscreen: !s.fullscreen }))
      else if (k === 'd') actions.setTab('results')
      else if (k === 't') actions.tour()
      else if (k === ' ') actions.togglePause()
      else if (k === 'escape') actions.stopTour()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [actions])

  const lab = LAB_TABS.includes(state.tab)
  const screen = lab ? 'lab' : state.tab
  return (
    <div className="relative flex h-full flex-col">
      <Background />
      <motion.header initial={false} animate={{ height: state.fullscreen ? 0 : 68, opacity: state.fullscreen ? 0 : 1 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }} className="relative z-20 shrink-0 overflow-hidden">
        <TopBar />
      </motion.header>
      <main className="relative z-10 min-h-0 flex-1 px-6 pt-2">
        <AnimatePresence mode="wait">
          <motion.div key={screen} className="h-full" initial={{ opacity: 0, y: 16, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.99 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            {screen === 'home' && <Hero />}
            {screen === 'lab' && <Lab />}
            {screen === 'results' && <Results />}
            {screen === 'about' && <About />}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="relative z-20 shrink-0"><BottomBar /></footer>
    </div>
  )
}
