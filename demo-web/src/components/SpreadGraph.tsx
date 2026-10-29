import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useRef, useState, type MouseEvent } from 'react'
import { C, stories, type GNode } from '../data'
import { useDemo } from '../store'

const R = { news: 30, user: 11, bot: 12.5 }
const FILL = { news: C.purple, user: C.blue, bot: C.coral }

export function topTen(importance: number[], visible: (id: number) => boolean) {
  return importance.map((v, id) => ({ id, v })).filter((d) => d.id > 0 && visible(d.id))
    .sort((a, b) => b.v - a.v).slice(0, 10).map((d) => d.id)
}

export function useGraphView() {
  const { state } = useDemo()
  const s = stories[state.story]
  const { phase, running, stage } = state
  const showNews = phase >= 1 || running === 'analyze'
  const showUsers = phase >= 1 || (running === 'analyze' && stage >= 1)
  const botCount = phase >= 2 ? s.k : running === 'attack' ? Math.min(stage, s.k) : 0
  const step = Math.max(0, phase - 1)
  const advModel = phase === 4 || (running === 'adv' && stage >= 1)
  const visible = (id: number) => (id === 0 ? showNews : id < s.n ? showUsers : id - s.n < botCount)
  return { s, showNews, showUsers, botCount, step, advModel, visible }
}

export default function SpreadGraph() {
  const { state } = useDemo()
  const { s, showNews, showUsers, botCount, step, advModel, visible } = useGraphView()
  const { instant, ripple, scan, botGen, explain, running } = state
  const [hover, setHover] = useState<{ node: GNode; x: number; y: number } | null>(null)
  const wrap = useRef<HTMLDivElement>(null)
  // tooltip coords relative to this box: the glass card (backdrop-filter) is the containing block, so `fixed` would drift
  const hoverAt = (node: GNode) => (e: MouseEvent) => {
    const r = wrap.current!.getBoundingClientRect()
    setHover({ node, x: Math.min(e.clientX - r.left, r.width - 300), y: Math.min(e.clientY - r.top, r.height - 150) })
  }

  const box = useMemo(() => {
    const xs = s.nodes.map((n) => n.x), ys = s.nodes.map((n) => n.y)
    const x0 = Math.min(...xs) - 70, y0 = Math.min(...ys) - 70
    return { x0, y0, w: Math.max(...xs) + 70 - x0, h: Math.max(...ys) + 70 - y0 }
  }, [s])
  const byId = s.nodes
  const users = s.n - 1
  const stagger = Math.min(0.05, 1.8 / users)
  const delayOf = (n: GNode) => (instant ? 0 : n.type === 'news' ? 0 : 0.15 + n.order * stagger)
  const imp = s.importance[step]
  const showImp = explain && state.phase >= 1
  const top = useMemo(() => (showImp ? topTen(imp, visible) : []), [showImp, imp, botCount, showUsers]) // eslint-disable-line
  const rank = (id: number) => top.indexOf(id)

  const radius = (n: GNode) => {
    const base = R[n.type]
    if (!showImp || n.type === 'news') return base
    return base * (0.7 + 1.5 * imp[n.id]) + (rank(n.id) >= 0 ? 3 : 0)
  }
  const opacity = (n: GNode) => (!showImp || n.type === 'news' ? 1 : rank(n.id) >= 0 ? 1 : 0.3 + 0.4 * imp[n.id])
  const news = byId[0]
  const userEdges = s.edges.map(([u, v]) => (byId[u].order < byId[v].order ? [u, v] : [v, u]) as [number, number])
  const bots = s.bots.slice(0, botCount).map((id) => byId[id])
  const visibleNodes = byId.filter((n) => visible(n.id))
  const maxDepth = Math.max(...visibleNodes.map((n) => n.depth))

  return (
    <div ref={wrap} className="relative h-full w-full" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`${box.x0} ${box.y0} ${box.w} ${box.h}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="7" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="newsGrad">
            <stop offset="0%" stopColor="#9d90ff" /><stop offset="100%" stopColor={C.purple} />
          </radialGradient>
          <linearGradient id="scanGrad" x1="0" x2="1">
            <stop offset="0%" stopColor={C.amber} stopOpacity="0" /><stop offset="85%" stopColor={C.amber} stopOpacity="0.18" />
            <stop offset="100%" stopColor={C.amber} stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* user reshare edges */}
        {showUsers && userEdges.map(([u, v]) => (
          <motion.path key={`e${state.story}-${u}-${v}`} d={`M${byId[u].x} ${byId[u].y}L${byId[v].x} ${byId[v].y}`}
            stroke={C.edge} strokeWidth={2} fill="none" strokeLinecap="round"
            initial={{ pathLength: instant ? 1 : 0, opacity: instant ? 0.9 : 0 }} animate={{ pathLength: 1, opacity: showImp ? 0.45 : 0.9 }}
            transition={{ duration: instant ? 0 : 0.45, delay: delayOf(byId[v]) - (instant ? 0 : 0.1), ease: 'easeOut' }} />
        ))}

        {/* bot edges: dashed, marching towards the news node */}
        <AnimatePresence>
          {bots.map((b) => (
            <motion.path key={`be${state.story}-${botGen}-${b.id}`} d={`M${b.x} ${b.y}L${news.x} ${news.y}`}
              stroke={C.coral} strokeWidth={2.4} strokeDasharray="7 5" fill="none" className="march"
              initial={{ opacity: 0 }} animate={{ opacity: showImp ? 0.5 : 0.85 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: instant ? 0 : 0.35, delay: instant ? 0 : 0.25 + (running === 'adv' ? b.order * 0.06 : 0) }} />
          ))}
        </AnimatePresence>

        {/* message passing ripple: out along reshare depth, then pooling back to the news node */}
        {ripple > 0 && showUsers && !instant && (
          <g key={`rip${ripple}`} pointerEvents="none">
            {userEdges.map(([u, v]) => (
              <path key={`re${u}-${v}`} d={`M${byId[u].x} ${byId[u].y}L${byId[v].x} ${byId[v].y}`} stroke="#cfe0ff"
                strokeWidth={4} className="ripple-edge" style={{ animationDelay: `${byId[v].depth * 0.32 - 0.2}s` }} />
            ))}
            {visibleNodes.map((n) => (
              <g key={`rn${n.id}`}>
                <circle cx={n.x} cy={n.y} r={R[n.type] + 4} fill="none" stroke="#dbe6ff" strokeWidth={3} className="ripple-node"
                  style={{ animationDelay: `${n.depth * 0.32}s` }} />
                <circle cx={n.x} cy={n.y} r={R[n.type] + 4} fill="none" stroke="#a99bff" strokeWidth={3} className="ripple-node"
                  style={{ animationDelay: `${(maxDepth - n.depth) * 0.22 + maxDepth * 0.32 + 0.35}s` }} />
              </g>
            ))}
          </g>
        )}

        {/* user nodes */}
        {showUsers && byId.slice(1, s.n).map((n) => (
          <motion.circle key={`n${state.story}-${n.id}`} cx={n.x} cy={n.y} fill={FILL.user} stroke="#0A0F1E" strokeWidth={2}
            initial={{ r: instant ? radius(n) : 0, opacity: instant ? opacity(n) : 0 }}
            animate={{ r: radius(n), opacity: opacity(n) }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: state.explain ? 0 : delayOf(n) }}
            onMouseEnter={hoverAt(n)} style={{ cursor: 'pointer' }} />
        ))}

        {/* bots */}
        <AnimatePresence>
          {bots.map((b) => (
            <motion.g key={`b${state.story}-${botGen}-${b.id}`} initial={{ opacity: 0, y: instant ? 0 : -110, scale: instant ? 1 : 0.3 }}
              animate={{ opacity: opacity(b), y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.2, transition: { duration: 0.25 } }}
              transition={{ type: 'spring', stiffness: 200, damping: 16, delay: instant ? 0 : running === 'adv' ? b.order * 0.06 : 0 }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
              <motion.circle cx={b.x} cy={b.y} fill={C.coral} stroke="#ffd0d9" strokeWidth={2} filter="url(#glow)"
                initial={false} animate={{ r: radius(b) }} onMouseEnter={hoverAt(b)}
                style={{ cursor: 'pointer' }} />
            </motion.g>
          ))}
        </AnimatePresence>

        {/* top-10 rings + ranks */}
        <AnimatePresence>
          {top.map((id, i) => {
            const n = byId[id]
            return (
              <motion.g key={`t${id}`} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} pointerEvents="none">
                <circle cx={n.x} cy={n.y} r={radius(n) + 6} fill="none" stroke={C.amber} strokeWidth={2.5} />
                <text x={n.x + radius(n) + 9} y={n.y - radius(n) - 2} fill={C.amber} fontSize={22} fontWeight={700}
                  fontFamily="JetBrains Mono" stroke="#0A0F1E" strokeWidth={5} paintOrder="stroke">{i + 1}</text>
              </motion.g>
            )
          })}
        </AnimatePresence>

        {/* news node */}
        {showNews && (
          <g>
            <circle cx={news.x} cy={news.y} r={R.news} fill="none" stroke={C.purple} strokeWidth={3} className="pulse-ring" />
            <motion.circle cx={news.x} cy={news.y} fill="url(#newsGrad)" stroke="#c9c2ff" strokeWidth={2.5} filter="url(#glow)"
              initial={{ r: instant ? R.news : 0 }} animate={{ r: R.news }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}
              onMouseEnter={hoverAt(news)} />
            <text x={news.x} y={news.y + 6} textAnchor="middle" fill="#fff" fontSize={17} fontWeight={700} fontFamily="JetBrains Mono"
              pointerEvents="none">NEWS</text>
            <AnimatePresence>
              {advModel && (
                <motion.g key="shield" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 160, damping: 14 }} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                  <motion.polygon points={hexagon(news.x, news.y, 54)} fill="rgba(46,230,168,0.07)" stroke={C.green} strokeWidth={3}
                    filter="url(#glow)" animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                    style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
                </motion.g>
              )}
            </AnimatePresence>
          </g>
        )}

        {/* bot-filter scan line */}
        {scan > 0 && running === 'filter' && (
          <g key={`scan${scan}`} pointerEvents="none">
            <motion.rect y={box.y0} height={box.h} width={160} fill="url(#scanGrad)" initial={{ x: box.x0 - 160 }}
              animate={{ x: box.x0 + box.w }} transition={{ duration: 2.3, ease: 'linear' }} />
            {visibleNodes.map((n) => (
              <circle key={`sf${n.id}`} cx={n.x} cy={n.y} r={R[n.type] + 5} fill="none" stroke={C.amber} strokeWidth={3}
                className="scan-flash" style={{ animationDelay: `${((n.x - box.x0) / box.w) * 2.3}s` }} />
            ))}
          </g>
        )}
      </svg>

      <AnimatePresence>
        {hover && (
          <Tooltip key={hover.node.id} {...hover} importance={showImp ? imp[hover.node.id] : null} />
        )}
      </AnimatePresence>
    </div>
  )
}

function hexagon(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
  }).join(' ')
}

function Tooltip({ node, x, y, importance }: { node: GNode; x: number; y: number; importance: number | null }) {
  const color = FILL[node.type]
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
      className="glass pointer-events-none absolute z-50 w-72 p-4" style={{ left: x + 18, top: y + 12 }}>
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: color }} />
        <span className="num text-[17px] font-semibold">{node.type === 'news' ? 'News (source post)' : node.handle}</span>
      </div>
      {node.type !== 'news' && (
        <div className="mt-2 space-y-1 text-[15px] text-muted">
          <div>{node.type === 'bot' ? 'Injected bot · clone of a real-news sharer' : `Reshare depth ${node.depth}`}</div>
          <div className="num">followers pctl {node.followersPct} · newness pctl {node.agePct}</div>
          {importance !== null && <div className="num text-amber">importance {importance.toFixed(2)}</div>}
        </div>
      )}
    </motion.div>
  )
}
