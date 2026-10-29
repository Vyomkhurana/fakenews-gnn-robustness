import { animate, motion, useInView } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'

export function CountUp({ to, decimals = 0, duration = 1.6, suffix = '', prefix = '' }:
  { to: number; decimals?: number; duration?: number; suffix?: string; prefix?: string }) {
  const [v, setV] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView) return
    const c = animate(0, to, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: setV })
    return () => c.stop()
  }, [to, duration, inView])
  const txt = v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return <span ref={ref} className="num">{prefix}{txt}{suffix}</span>
}

export function Card({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`glass ${className}`}>
      {children}
    </motion.div>
  )
}

export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="grid-bg" />
      <div className="absolute -left-40 -top-40 h-[620px] w-[620px] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(108,92,231,.55), transparent 65%)' }} />
      <div className="absolute -bottom-52 -right-40 h-[700px] w-[700px] rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(46,230,168,.35), transparent 65%)' }} />
    </div>
  )
}

export function Btn({ children, onClick, color, disabled, big }:
  { children: ReactNode; onClick: () => void; color: string; disabled?: boolean; big?: boolean }) {
  return (
    <motion.button whileHover={disabled ? {} : { scale: 1.02, y: -1 }} whileTap={disabled ? {} : { scale: 0.98 }} onClick={onClick}
      disabled={disabled} transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={`w-full rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${big ? 'px-5 py-4 text-[19px]' : 'px-4 py-3 text-[17px]'}`}
      style={{ background: `${color}22`, color, border: `1px solid ${color}88`, boxShadow: disabled ? 'none' : `0 0 28px -10px ${color}` }}>
      {children}
    </motion.button>
  )
}
