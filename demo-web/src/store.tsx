import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { f3, pct, results, stories } from './data'

export type Tab = 'home' | 'analyze' | 'attack' | 'defend' | 'explain' | 'results' | 'about'
/** 0 nothing scored · 1 clean · 2 attacked · 3 attacked + filter · 4 adv-trained model under adaptive attack */
export type Phase = 0 | 1 | 2 | 3 | 4
export type Running = null | 'analyze' | 'attack' | 'filter' | 'adv'
export type LogKind = 'run' | 'ok' | 'warn' | 'bad' | 'info' | 'red' | 'blue'
export interface LogLine { id: number; t: number; text: string; kind: LogKind }

export const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' }, { id: 'analyze', label: 'Analyze' }, { id: 'attack', label: 'Red team' },
  { id: 'defend', label: 'Blue team' }, { id: 'explain', label: 'Explain' }, { id: 'results', label: 'Results' },
  { id: 'about', label: 'About' },
]
export const LAB_TABS: Tab[] = ['analyze', 'attack', 'defend', 'explain']

// presenter path for → / ←
const STEPS: { tab: Tab; phase?: Phase; run?: Running; explain?: boolean }[] = [
  { tab: 'home' },
  { tab: 'analyze', phase: 1, run: 'analyze' },
  { tab: 'attack', phase: 2, run: 'attack' },
  { tab: 'defend', phase: 3, run: 'filter' },
  { tab: 'defend', phase: 4, run: 'adv' },
  { tab: 'explain', phase: 4, explain: true },
  { tab: 'results' },
  { tab: 'about' },
]

export interface State {
  tab: Tab
  story: number
  phase: Phase
  running: Running
  stage: number
  instant: boolean
  ripple: number
  scan: number
  botGen: number
  explain: boolean
  fullscreen: boolean
  log: LogLine[]
  pstep: number
  tour: { active: boolean; paused: boolean; caption: string; done: boolean }
}

const initial: State = {
  tab: 'home', story: 0, phase: 0, running: null, stage: 0, instant: false, ripple: 0, scan: 0, botGen: 0,
  explain: false, fullscreen: false, log: [], pstep: 0, tour: { active: false, paused: false, caption: '', done: false },
}

export const pFor = (story: number, phase: Phase) => (phase === 0 ? null : stories[story].p[phase - 1])
export const verdictOf = (p: number) => (p > 0.5 ? 'FAKE' : 'REAL')

/** log lines shown after jumping straight to a phase (no animation) */
function summaryLog(story: number, phase: Phase): Omit<LogLine, 'id' | 't'>[] {
  const s = stories[story]
  const out: Omit<LogLine, 'id' | 't'>[] = []
  if (phase >= 1) out.push({ text: `Analysed ${s.users} users, ${s.edgeCount} reshare edges`, kind: 'ok' },
    { text: `Verdict: FAKE · P(fake) = ${f3(s.p[0])} · close call`, kind: 'bad' })
  if (phase >= 2) out.push({ text: `[red team] injected ${s.k} smart bots (20% of ${s.n} nodes)`, kind: 'red' },
    { text: `Detector fooled: P(fake) ${f3(s.p[0])} → ${f3(s.p[1])} (REAL)`, kind: 'bad' })
  if (phase === 3) out.push({ text: `[blue team] bot filter: ${s.filter.flagged} of ${s.filter.checked} accounts flagged`, kind: 'warn' })
  if (phase === 4) out.push({ text: `[blue team] adversarially trained GCN, bots re-crafted against it`, kind: 'blue' },
    { text: `Detected again: P(fake) = ${f3(s.p[3])} (FAKE)`, kind: 'ok' })
  return out
}

function useDemoState() {
  const [state, setState] = useState<State>(initial)
  const ref = useRef(state)
  ref.current = state
  const gen = useRef(0)
  const tourGen = useRef(0)
  const logT0 = useRef(performance.now())
  const logId = useRef(0)

  const set = useCallback((patch: Partial<State> | ((s: State) => Partial<State>)) =>
    setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })), [])
  const sleep = (ms: number, g: number) => new Promise<boolean>((res) => setTimeout(() => res(gen.current === g), ms))
  const addLog = useCallback((text: string, kind: LogKind) => {
    const id = ++logId.current
    const t = (performance.now() - logT0.current) / 1000
    set((s) => ({ log: [...s.log.slice(-60), { id, t, text, kind }] }))
    return id
  }, [set])
  const markLog = useCallback((id: number, kind: LogKind) =>
    set((s) => ({ log: s.log.map((l) => (l.id === id ? { ...l, kind } : l)) })), [set])

  const jump = useCallback((phase: Phase, extra: Partial<State> = {}) => {
    gen.current++
    logT0.current = performance.now()
    const story = extra.story ?? ref.current.story
    set({
      phase, running: null, stage: 0, instant: true, ...extra,
      log: summaryLog(story, phase).map((l) => ({ ...l, id: ++logId.current, t: 0 })),
    })
  }, [set])

  const stepIndex = (run: Running) => STEPS.findIndex((s) => s.run === run)

  const analyze = useCallback(async (story?: number) => {
    if (ref.current.running) return
    const g = ++gen.current
    const si = story ?? ref.current.story
    const s = stories[si]
    logT0.current = performance.now()
    set({ story: si, tab: 'analyze', phase: 0, running: 'analyze', stage: 0, instant: false, explain: false, log: [], pstep: stepIndex('analyze') })
    const steps: [string, number][] = [
      [`Fetching reshare cascade for ${s.newsId ?? s.label}…`, 700],
      [`Building propagation graph (${s.users} users, ${s.edgeCount} edges)`, 2100],
      ['Encoding user profiles + text (310 features)', 700],
      ['Running GCN message passing (1 graph-conv layer)', 1300],
      ['Pooling graph (max-pool + news-node features)', 900],
      ['Scoring', 600],
    ]
    for (let i = 0; i < steps.length; i++) {
      const id = addLog(steps[i][0], 'run')
      set((st) => ({ stage: i, ripple: i === 3 ? st.ripple + 1 : st.ripple }))
      if (!(await sleep(steps[i][1], g))) return
      markLog(id, 'ok')
    }
    set({ phase: 1, running: null })
    addLog(`Verdict: FAKE · P(fake) = ${f3(s.p[0])} · close call`, 'bad')
  }, [set, addLog, markLog])

  const attack = useCallback(async () => {
    if (ref.current.running) return
    if (ref.current.phase < 1) jump(1)
    const g = gen.current
    const s = stories[ref.current.story]
    set({ tab: 'attack', running: 'attack', stage: 0, instant: false, explain: false, pstep: stepIndex('attack') })
    addLog(`[red team] budget: ${s.k} bots = 20% of ${s.n} nodes`, 'red')
    addLog('[red team] greedy black-box: each bot clones the real-news sharer that most lowers P(fake)', 'red')
    if (!(await sleep(500, g))) return
    for (let i = 0; i < s.k; i++) {
      set({ stage: i + 1 })
      addLog(`[bot ${String(i + 1).padStart(2, '0')}] cloned real-news sharer → reshared`, 'red')
      if (!(await sleep(380, g))) return
    }
    const id = addLog('Re-scoring with GCN…', 'run')
    set((st) => ({ ripple: st.ripple + 1 }))
    if (!(await sleep(1300, g))) return
    markLog(id, 'ok')
    set({ phase: 2, running: null })
    addLog(`Detector fooled: P(fake) ${f3(s.p[0])} → ${f3(s.p[1])} (REAL)`, 'bad')
  }, [set, addLog, markLog, jump])

  const filter = useCallback(async () => {
    if (ref.current.running) return
    if (ref.current.phase < 2) jump(2)
    const g = gen.current
    const s = stories[ref.current.story]
    set((st) => ({ tab: 'defend', running: 'filter', instant: false, explain: false, scan: st.scan + 1, pstep: stepIndex('filter') }))
    addLog(`[blue team] bot filter: checking ${s.filter.checked} accounts`, 'blue')
    addLog('rule: newest-5% account AND bottom-5% followers AND bottom-5% activity', 'info')
    if (!(await sleep(2600, g))) return
    addLog(`${s.filter.flagged} of ${s.filter.checked} accounts flagged — bots copy real profiles`, 'warn')
    set({ phase: 3, running: null })
    addLog(`Verdict unchanged: REAL (P(fake) = ${f3(s.p[2])})`, 'bad')
  }, [set, addLog, jump])

  const adv = useCallback(async () => {
    if (ref.current.running) return
    if (ref.current.phase < 2) jump(2)
    const g = gen.current
    const s = stories[ref.current.story]
    set({ tab: 'defend', running: 'adv', stage: 0, instant: false, explain: false, pstep: stepIndex('adv') })
    addLog('[blue team] loading GCN adversarially trained on bot-injected graphs', 'blue')
    if (!(await sleep(800, g))) return
    set((st) => ({ stage: 1, botGen: st.botGen + 1 }))
    addLog(`[red team] re-crafting ${s.k} bots against the new model (adaptive attack)`, 'red')
    if (!(await sleep(1500, g))) return
    const id = addLog('Re-scoring with adversarially trained GCN…', 'run')
    set((st) => ({ ripple: st.ripple + 1 }))
    if (!(await sleep(1300, g))) return
    markLog(id, 'ok')
    set({ phase: 4, running: null })
    addLog(`Detected again: P(fake) = ${f3(s.p[3])} (FAKE)`, 'ok')
  }, [set, addLog, markLog, jump])

  const setStory = useCallback((story: number) => {
    gen.current++
    set({ story, phase: 0, running: null, stage: 0, log: [], explain: false, instant: true })
  }, [set])

  const setTab = useCallback((tab: Tab) => set({ tab, pstep: Math.max(0, STEPS.findIndex((s) => s.tab === tab)) }), [set])

  const go = useCallback((dir: 1 | -1) => {
    const st = ref.current
    if (st.running) return
    const i = Math.min(STEPS.length - 1, Math.max(0, st.pstep + dir))
    const step = STEPS[i]
    if (dir === 1 && step.run) {
      ({ analyze, attack, filter, adv } as const)[step.run]()
      return
    }
    const phase = step.phase ?? (dir === -1 && i === 0 ? 0 : st.phase)
    if (phase !== st.phase) jump(phase as Phase)
    set({ tab: step.tab, explain: !!step.explain, pstep: i })
  }, [analyze, attack, filter, adv, jump, set])

  const reset = useCallback(() => {
    gen.current++
    tourGen.current++
    setState((s) => ({ ...initial, story: s.story, fullscreen: s.fullscreen }))
  }, [])

  const tour = useCallback(async () => {
    const tg = ++tourGen.current
    gen.current++
    setState((s) => ({ ...initial, story: s.story, fullscreen: s.fullscreen, tour: { active: true, paused: false, caption: '', done: false } }))
    const alive = () => tourGen.current === tg
    const wait = async (ms: number) => {
      let left = ms
      while (left > 0) {
        await new Promise((r) => setTimeout(r, 100))
        if (!alive()) return false
        if (!ref.current.tour.paused) left -= 100
      }
      return true
    }
    const untilIdle = async () => {
      await wait(150)
      while (alive() && ref.current.running) await new Promise((r) => setTimeout(r, 100))
      return alive()
    }
    const cap = (caption: string) => set((s) => ({ tour: { ...s.tour, caption } }))
    const s = stories[ref.current.story]
    const g = results.defense20.GCN, e = results.explainTop10, nTest = results.datasets.politifact.test
    const script: (() => Promise<boolean>)[] = [
      async () => { cap('SpreadShield judges a news story by how it spreads on Twitter, not only by what it says.'); return wait(5000) },
      async () => { cap('We rebuild who-reshared-whom as a graph and let a graph neural network score the spread.'); analyze(); return untilIdle() },
      async () => { cap(`Verdict: FAKE — a close call at P(fake) = ${f3(s.p[0])}. The ground truth agrees: PolitiFact rated it fake.`); return wait(5000) },
      async () => { cap(`Red team: an attacker injects ${s.k} bots that clone real users and reshare the story.`); attack(); return untilIdle() },
      async () => { cap(`The detector is fooled — the same story now scores REAL (P(fake) = ${f3(s.p[1])}).`); return wait(5000) },
      async () => { cap('Blue team: a rule-based bot filter checks every account…'); filter(); return untilIdle() },
      async () => { cap('…and flags none of them. These bots copy real profiles, so the verdict stays REAL.'); return wait(4500) },
      async () => { cap('Now a model trained on bot-injected graphs. The attacker re-crafts the bots against it too…'); adv(); return untilIdle() },
      async () => { cap(`…and the story is detected as FAKE again (P(fake) = ${f3(s.p[3])}).`); return wait(5000) },
      async () => { jump(2, { tab: 'explain', explain: true, pstep: 5 }); cap('GNNExplainer shows which accounts drove the decision. Under attack, bots crowd the top-10.'); return wait(7000) },
      async () => { jump(4, { tab: 'explain', explain: true, pstep: 5 }); cap(`The adversarially trained model leans on bots far less: ${pct(e.adv)} of its top-10 vs ${pct(e.normal)} (${e.graphs} stories).`); return wait(7000) },
      async () => { set({ tab: 'results', pstep: 6 }); cap(`Across all ${nTest} test stories: smart bots cut GCN accuracy from ${f3(g.clean)} to ${f3(g.attack)}.`); return wait(7000) },
      async () => { cap(`Adversarial training brings it back to ${f3(g.adv)} — even when the bots are re-crafted against it.`); return wait(7000) },
    ]
    for (const step of script) if (!(await step())) return
    set((st) => ({ tour: { ...st.tour, active: false, done: true, caption: 'Tour complete — press → / ← to explore, or T to replay.' } }))
  }, [analyze, attack, filter, adv, jump, set])

  const togglePause = useCallback(() => set((s) => (s.tour.active ? { tour: { ...s.tour, paused: !s.tour.paused } } : {})), [set])
  const stopTour = useCallback(() => { tourGen.current++; set((s) => ({ tour: { ...s.tour, active: false, paused: false } })) }, [set])

  const actions = useMemo(() => ({
    set, analyze, attack, filter, adv, jump, setStory, setTab, go, reset, tour, togglePause, stopTour,
  }), [set, analyze, attack, filter, adv, jump, setStory, setTab, go, reset, tour, togglePause, stopTour])
  return { state, actions }
}

type Demo = ReturnType<typeof useDemoState>
const Ctx = createContext<Demo | null>(null)
export function DemoProvider({ children }: { children: ReactNode }) {
  const demo = useDemoState()
  return <Ctx.Provider value={demo}>{children}</Ctx.Provider>
}
export function useDemo() {
  const d = useContext(Ctx)
  if (!d) throw new Error('useDemo outside DemoProvider')
  return d
}
