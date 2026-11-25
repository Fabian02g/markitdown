import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from 'motion/react'
import { CalendarArrowUp, Check } from 'lucide-react'

/** Curvas y tiempos compartidos: rápidos y suaves */
export const ease = [0.22, 1, 0.36, 1] as const
export const spring = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 } as const

export const haptic = (ms = 12) => { try { navigator.vibrate?.(ms) } catch { /* sin vibración */ } }

/** Contenedor que hace entrar a sus hijos en cascada */
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
}
export const rise = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
}

/** Número que sube contando hasta su valor */
export function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce ? value : 0)
  const prev = useRef(reduce ? value : 0)
  useEffect(() => {
    if (reduce) { setShown(value); return }
    const c = animate(prev.current, value, { duration: 0.7, ease, onUpdate: (v) => setShown(Math.round(v)) })
    prev.current = value
    return () => c.stop()
  }, [value, reduce])
  return <span className="tabular-nums">{shown}</span>
}

/** Festejo breve: chispas que salen desde un punto */
const COLORS = ['var(--accent)', 'var(--accent-2)', '#34d399', '#facc15', '#f472b6', '#38bdf8']
let fireFn: ((x: number, y: number) => void) | null = null
export const celebrate = (x = window.innerWidth / 2, y = window.innerHeight / 3) => fireFn?.(x, y)

export function ConfettiLayer() {
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([])
  const reduce = useReducedMotion()
  useEffect(() => {
    fireFn = (x, y) => {
      if (reduce) return
      const id = Date.now() + Math.random()
      setBursts((b) => [...b, { id, x, y }])
      setTimeout(() => setBursts((b) => b.filter((z) => z.id !== id)), 1300)
    }
    return () => { fireFn = null }
  }, [reduce])
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {bursts.map((b) => Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2 + Math.random() * 0.3
        const d = 70 + Math.random() * 90
        return (
          <motion.span key={`${b.id}-${i}`} className="absolute block rounded-[2px]"
            style={{ left: b.x, top: b.y, width: i % 3 ? 6 : 8, height: i % 3 ? 10 : 8, background: COLORS[i % COLORS.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d + 90, opacity: 0, rotate: 260 * (i % 2 ? 1 : -1), scale: 1 }}
            transition={{ duration: 1.1, ease: [0.15, 0.6, 0.35, 1] }} />
        )
      }))}
    </div>
  )
}

/** Fila deslizable en el celular: → completa, ← pasa para mañana */
export function SwipeRow({ children, onRight, onLeft, rightLabel = 'Hecha', leftLabel = 'Mañana', disabled }: {
  children: ReactNode; onRight: () => void; onLeft?: () => void; rightLabel?: string; leftLabel?: string; disabled?: boolean
}) {
  const x = useMotionValue(0)
  const rightOpacity = useTransform(x, [12, 80], [0, 1])
  const leftOpacity = useTransform(x, [-12, -80], [0, 1])
  const [coarse] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches)
  const dragged = useRef(0)
  if (disabled || !coarse) return <>{children}</>
  const end = (_: unknown, info: PanInfo) => {
    dragged.current = Date.now()
    if (info.offset.x > 90) { haptic(); onRight() }
    else if (info.offset.x < -90 && onLeft) { haptic(); onLeft() }
  }
  return (
    <div className="relative overflow-hidden rounded-xl">
      <motion.div style={{ opacity: rightOpacity }} className="absolute inset-0 flex items-center gap-2 rounded-xl bg-ok/20 pl-4 text-[13px] font-semibold text-ok">
        <Check size={16} />{rightLabel}
      </motion.div>
      {onLeft && (
        <motion.div style={{ opacity: leftOpacity }} className="absolute inset-0 flex items-center justify-end gap-2 rounded-xl bg-sky-400/20 pr-4 text-[13px] font-semibold text-sky-300">
          {leftLabel}<CalendarArrowUp size={16} />
        </motion.div>
      )}
      <motion.div style={{ x }} drag="x" dragDirectionLock dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: onLeft ? 0.5 : 0.05, right: 0.5 }}
        onDragStart={() => { dragged.current = Date.now() }} onDrag={() => { dragged.current = Date.now() }}
        onDragEnd={end} className="relative bg-surface"
        onClickCapture={(e) => { if (Date.now() - dragged.current < 350) { e.stopPropagation(); e.preventDefault() } }}>
        {children}
      </motion.div>
    </div>
  )
}

/** Silueta de carga */
export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-2 ${className ?? ''}`} />
}

export function AppSkeleton() {
  return (
    <div className="min-h-full lg:pl-[248px]">
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] space-y-3 border-r border-line p-4 lg:block">
        <Skeleton className="h-9 w-40" /><Skeleton className="h-10" />
        {Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="h-7" />)}
      </aside>
      <div className="mx-auto max-w-[1400px] space-y-4 px-4 pt-20 sm:px-6">
        <Skeleton className="h-36 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3 xl:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
      </div>
    </div>
  )
}
