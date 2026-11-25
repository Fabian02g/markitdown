import { useEffect, useRef, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { AnimatePresence, animate, motion, useIsPresent, useMotionValue } from 'motion/react'
import { PALETTE } from '../lib/constants'

const isMobile = () => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 639px)').matches

export function Modal({ open = true, onClose, title, children, footer, wide }: {
  open?: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean
}) {
  const [mobile] = useState(isMobile)
  const present = useIsPresent()
  const dragY = useMotionValue(0)
  const touch = useRef<number | null>(null)
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  // cerrar deslizando la barra superior hacia abajo (gesto simple, sin "drag")
  const tStart = (e: React.TouchEvent) => { if (mobile) touch.current = e.touches[0].clientY }
  const tMove = (e: React.TouchEvent) => { if (touch.current !== null) dragY.set(Math.max(0, e.touches[0].clientY - touch.current)) }
  const tEnd = () => {
    if (touch.current === null) return
    touch.current = null
    if (dragY.get() > 110) onClose(); else animate(dragY, 0, { type: 'spring', stiffness: 500, damping: 40 })
  }
  return (
    <div className={clsx('fixed inset-0 z-50 flex items-end sm:items-center justify-center', !present && 'pointer-events-none')}>
      <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
      <motion.div
        role="dialog" aria-modal="true"
        initial={mobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 8 }}
        animate={mobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={mobile ? { y: '100%' } : { opacity: 0, scale: 0.97, y: 6 }}
        transition={mobile ? { type: 'tween', duration: 0.26, ease: [0.22, 1, 0.36, 1] } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ translateY: dragY }}
        className={clsx(
          'modal-surface relative flex max-h-[94dvh] w-full flex-col rounded-t-3xl sm:rounded-2xl border border-line shadow-2xl',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-xl',
        )}
      >
        <div onTouchStart={tStart} onTouchMove={tMove} onTouchEnd={tEnd} onTouchCancel={tEnd}>
          <div className="mx-auto mt-2.5 h-1.5 w-11 rounded-full bg-line-strong sm:hidden" />
          {title !== undefined && (
            <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
              <div className="h2 text-base">{title}</div>
              <button className="btn btn-ghost -mr-3 h-11 w-11 px-0" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} aria-label="Cerrar"><X size={20} /></button>
            </div>
          )}
          {title === undefined && <div className="h-2" />}
        </div>
        <div className={clsx("flex-1 overflow-y-auto px-5 pb-5", !footer && "pb-safe")}>{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3 pb-safe">{footer}</div>}
      </motion.div>
    </div>
  )
}

export const Dot = ({ color, size = 8 }: { color: string; size?: number }) => (
  <span className="inline-block shrink-0 rounded-full" style={{ background: color, width: size, height: size, boxShadow: `0 0 0 3px ${color}22` }} />
)

export function Badge({ color, children, className }: { color: string; children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium', className)}
      style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}
    >{children}</span>
  )
}

export function Progress({ value, color }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color ?? 'var(--accent)' }} />
    </div>
  )
}

export function CheckCircle({ checked, onChange, color, label }: { checked: boolean; onChange: () => void; color?: string; label?: string }) {
  return (
    <motion.button
      type="button" whileTap={{ scale: 0.82 }}
      onClick={(e) => { e.stopPropagation(); if (!checked) { try { navigator.vibrate?.(12) } catch { /* */ } } onChange() }}
      aria-label={label ?? (checked ? 'Marcar pendiente' : 'Marcar como hecha')}
      className={clsx('relative grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2 transition-colors duration-200',
        checked ? 'border-transparent text-white' : 'border-line-strong hover:border-[var(--accent)]')}
    >
      <AnimatePresence>
        {checked && (
          <motion.span key="fill" className="absolute inset-[-2px] rounded-full" style={{ background: color ?? 'var(--ok)' }}
            initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 26 }} />
        )}
      </AnimatePresence>
      {checked && (
        <svg viewBox="0 0 24 24" width="13" height="13" className="relative" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.28, delay: 0.06, ease: 'easeOut' }} />
        </svg>
      )}
    </motion.button>
  )
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <div className="relative mb-2 h-16 w-20">
        <motion.span className="absolute left-1 top-3 h-12 w-14 -rotate-6 rounded-2xl border border-line bg-surface-2"
          initial={{ rotate: 0, y: 6 }} animate={{ rotate: -6, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} />
        <motion.span className="absolute right-1 top-1 h-12 w-14 rotate-6 rounded-2xl border border-line"
          style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 35%, var(--surface-2)), var(--surface-2))' }}
          initial={{ rotate: 0, y: 6 }} animate={{ rotate: 6, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }} />
        <span className="absolute inset-0 grid place-items-center text-ink/90">{icon}</span>
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && <div className="max-w-sm text-[13px] text-muted">{children}</div>}
    </motion.div>
  )
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <label className={clsx('block', className)}><span className="label">{label}</span>{children}</label>
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, ReactNode][] }) {
  return (
    <div className="seg">
      {options.map(([v, l]) => <button key={v} type="button" className={clsx(value === v && 'on')} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  )
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PALETTE.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)} aria-label={`Color ${c}`}
          className={clsx('h-7 w-7 rounded-full transition-transform hover:scale-110', value === c && 'ring-2 ring-offset-2 ring-offset-[var(--surface)]')}
          style={{ background: c, ['--tw-ring-color' as string]: c }} />
      ))}
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-line bg-transparent" aria-label="Color personalizado" />
    </div>
  )
}

export function ConfirmButton({ onConfirm, children, className, confirmText = '¿Seguro?' }: { onConfirm: () => void; children: ReactNode; className?: string; confirmText?: string }) {
  const [armed, setArmed] = useState(false)
  const t = useRef<number>(0)
  useEffect(() => () => clearTimeout(t.current), [])
  return (
    <button type="button" className={clsx('btn', className, armed && 'btn-danger')}
      onClick={() => {
        if (armed) { clearTimeout(t.current); setArmed(false); onConfirm() }
        else { setArmed(true); t.current = window.setTimeout(() => setArmed(false), 3000) }
      }}>
      {armed ? confirmText : children}
    </button>
  )
}

export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim().replace(/^#/, '')
    if (v && !value.includes(v)) onChange([...value, v])
    setDraft('')
  }
  return (
    <div className="input flex h-auto min-h-10 flex-wrap items-center gap-1.5 py-1.5">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-md bg-surface-3 px-2 py-0.5 text-xs">
          #{t}<button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Quitar ${t}`} className="text-muted hover:text-ink"><X size={12} /></button>
        </span>
      ))}
      <input
        className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
        value={draft} placeholder={value.length ? '' : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1)) }}
        onBlur={add}
      />
    </div>
  )
}

export function PageHead({ kicker, title, children }: { kicker?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {kicker && <div className="kicker mb-1">{kicker}</div>}
        <h1 className="h1 flex items-center gap-2.5">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}
