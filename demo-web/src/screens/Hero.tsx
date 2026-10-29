import { forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force'
import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { CountUp } from '../components/ui'
import { C, results, stories } from '../data'
import { useDemo } from '../store'

interface SimNode extends SimulationNodeDatum { type: 'news' | 'user' | 'bot'; ax: number; ay: number; phase: number }

/** The three saved story graphs, drifting under a live d3-force simulation. */
function HeroGraph() {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = canvas.current!
    const ctx = cv.getContext('2d')!
    let w = 0, h = 0
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      w = cv.clientWidth; h = cv.clientHeight
      cv.width = w * dpr; cv.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    const anchors = [[0.16, 0.62], [0.84, 0.36], [0.82, 0.86]]
    const nodes: SimNode[] = [], links: { source: number; target: number }[] = []
    stories.forEach((s, si) => {
      const off = nodes.length
      s.nodes.slice(0, s.n).forEach((n) => nodes.push({ type: n.type, ax: si, ay: si, phase: Math.random() * 6.28,
        x: anchors[si][0] * w + n.x * 0.42, y: anchors[si][1] * h + n.y * 0.42 }))
      s.edges.forEach(([u, v]) => links.push({ source: off + u, target: off + v }))
    })
    const sim = forceSimulation(nodes)
      .force('link', forceLink(links).distance(34).strength(0.5))
      .force('charge', forceManyBody().strength(-26))
      .force('x', forceX<SimNode>((d) => anchors[d.ax][0] * w).strength(0.012))
      .force('y', forceY<SimNode>((d) => anchors[d.ay][1] * h).strength(0.012))
      .alphaTarget(0.02).velocityDecay(0.5).stop()
    let raf = 0
    const draw = (t: number) => {
      for (const n of nodes) { n.vx = (n.vx ?? 0) + (Math.random() - 0.5) * 0.12; n.vy = (n.vy ?? 0) + (Math.random() - 0.5) * 0.12 }
      sim.tick()
      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(123,150,255,0.22)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      for (const l of links) { // forceLink has replaced the indices with node objects
        const a = l.source as unknown as SimNode, b = l.target as unknown as SimNode
        ctx.moveTo(a.x!, a.y!); ctx.lineTo(b.x!, b.y!)
      }
      ctx.stroke()
      for (const n of nodes) {
        const news = n.type === 'news'
        const r = news ? 9 + 2.5 * Math.sin(t / 500 + n.phase) : 3.4 + 0.9 * Math.sin(t / 700 + n.phase)
        ctx.beginPath(); ctx.arc(n.x!, n.y!, r, 0, Math.PI * 2)
        ctx.fillStyle = news ? C.purple : 'rgba(123,150,255,0.75)'
        ctx.shadowColor = news ? C.purple : C.blue; ctx.shadowBlur = news ? 24 : 8
        ctx.fill()
      }
      ctx.shadowBlur = 0
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); sim.stop() }
  }, [])
  return <canvas ref={canvas} className="absolute inset-0 h-full w-full opacity-70" />
}

export default function Hero() {
  const { state, actions } = useDemo()
  const d = results.datasets
  const graphs = d.politifact.graphs + d.gossipcop.graphs
  const users = d.politifact.nodes + d.gossipcop.nodes - graphs
  const stats: [number, string][] = [[graphs, 'news graphs analysed'], [users, 'Twitter users in the graphs'], [3, 'GNN models compared']]
  const ease = [0.16, 1, 0.3, 1] as const
  return (
    <div className="relative h-full overflow-hidden rounded-3xl">
      <HeroGraph />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(10,15,30,.92) 25%, rgba(10,15,30,.35) 70%)' }} />
      <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}
          className="num rounded-full border border-line bg-card/70 px-4 py-1.5 text-[15px] text-muted">
          Graph neural networks · bot attacks · defenses · explanations
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: 0.1, ease }}
          className="mt-6 bg-gradient-to-r from-[#c9c2ff] via-[#EAF0FF] to-[#2EE6A8] bg-clip-text text-[clamp(64px,8vw,120px)] font-extrabold leading-none tracking-tight text-transparent">
          SpreadShield
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25, ease }}
          className="mt-5 text-[clamp(22px,2vw,30px)] text-muted">Catching fake news by <span className="text-ink">how it spreads</span></motion.p>
        <div className="mt-12 grid grid-cols-3 gap-5">
          {stats.map(([v, label], i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 + i * 0.12, ease }}
              className="glass min-w-[230px] px-7 py-5">
              <div className="text-[clamp(34px,3vw,46px)] font-bold" style={{ color: [C.blue, C.green, C.amber][i] }}><CountUp to={v} duration={1.8} /></div>
              <div className="mt-1 text-[16px] text-muted">{label}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.8, ease }} className="mt-12 flex gap-4">
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => actions.analyze(state.story)}
            className="rounded-2xl px-8 py-4 text-[20px] font-bold text-bg"
            style={{ background: 'linear-gradient(90deg,#7B96FF,#2EE6A8)', boxShadow: '0 0 50px -10px #2EE6A8' }}>
            Start live analysis →
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => actions.tour()}
            className="rounded-2xl border border-line bg-card/70 px-8 py-4 text-[20px] font-semibold">
            ▶ Guided tour
          </motion.button>
        </motion.div>
        <div className="num mt-8 text-[14px] text-muted">PolitiFact {d.politifact.graphs} + GossipCop {d.gossipcop.graphs.toLocaleString('en-US')} propagation graphs (UPFD)</div>
      </div>
    </div>
  )
}
