import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion, useIsPresent } from 'motion/react'
import { ConfettiLayer, ease } from './motion'
import { RefreshCw } from 'lucide-react'
import { loadAll } from '../lib/store'
import clsx from 'clsx'
import {
  Bell, Briefcase, CalendarDays, CalendarRange, Clapperboard, FolderKanban, Home, LayoutList, Menu, Plus, Search, Send, Settings,
  StickyNote, User, Users, X, Cloud, CloudUpload,
} from 'lucide-react'
import { useSpaces } from '../lib/selectors'
import { dismissToast, openModal, useStore } from '../lib/store'
import { ruleLabel } from '../lib/constants'
import { Dot } from './ui'
import { TaskModal } from './TaskModal'
import { PieceModal } from './PieceModal'
import { NoteModal } from './NoteModal'
import { QuickCapture } from './QuickCapture'
import { SearchPalette } from './SearchPalette'

function NavItem({ to, icon, children, end, onClick }: { to: string; icon: ReactNode; children: ReactNode; end?: boolean; onClick?: () => void }) {
  return (
    <NavLink to={to} end={end} onClick={onClick}
      className={({ isActive }) => clsx('group relative flex h-9 items-center gap-2.5 rounded-xl px-3 text-[13.5px] font-medium transition-colors',
        isActive ? 'text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink')}>
      {({ isActive }) => <>
        {isActive && <motion.span layoutId={'nav-active-' + (onClick ? 'd' : 's')} className="nav-active absolute inset-0 rounded-xl" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
        <span className={clsx('relative grid w-[18px] place-items-center', isActive && 'text-accent-2')}>{icon}</span>
        <span className="relative truncate">{children}</span>
      </>}
    </NavLink>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const spaces = useSpaces()
  const profile = useStore((s) => s.profile)
  const syncing = useStore((s) => s.syncing)
  const fijos = spaces.filter((s) => s.kind === 'fijo')
  const clients = spaces.filter((s) => s.kind === 'cliente')
  const personal = spaces.filter((s) => s.kind === 'personal')
  const I = 17
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-3 pb-4 pt-1">
        <div className="grid h-9 w-9 place-items-center rounded-xl text-[15px] font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}>
          {(profile?.display_name || 'M').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">Mi Panel</div>
          <div className="truncate text-xs text-muted">{profile?.display_name}</div>
        </div>
      </div>
      <button className="btn btn-primary mx-1 mb-4" onClick={() => { onNavigate?.(); openModal({ type: 'task' }) }}><Plus size={16} />Nueva tarea</button>
      <nav className="flex-1 space-y-5 overflow-y-auto px-1 pb-4 no-scrollbar">
        <div className="space-y-0.5">
          <NavItem to="/" end icon={<Home size={I} />} onClick={onNavigate}>Mi panel</NavItem>
          <NavItem to="/agenda" icon={<CalendarDays size={I} />} onClick={onNavigate}>Mi agenda</NavItem>
          <NavItem to="/semana" icon={<CalendarRange size={I} />} onClick={onNavigate}>Mi semana</NavItem>
          <NavItem to="/tareas" icon={<LayoutList size={I} />} onClick={onNavigate}>Tabla de tareas</NavItem>
          <NavItem to="/editorial" icon={<Clapperboard size={I} />} onClick={onNavigate}>Calendario editorial</NavItem>
          <NavItem to="/hoy" icon={<Send size={I} />} onClick={onNavigate}>Hoy sale</NavItem>
        </div>
        <div className="space-y-0.5">
          <p className="kicker px-3 pb-1.5">Espacios</p>
          {fijos.map((s) => <NavItem key={s.id} to={`/espacio/${s.id}`} icon={<Briefcase size={I} />} onClick={onNavigate}>{s.name}</NavItem>)}
          <NavItem to="/clientes" icon={<Users size={I} />} onClick={onNavigate}>Clientes freelance</NavItem>
          <div className="ml-4 space-y-0.5 border-l border-line pl-2">
            {clients.map((s) => <NavItem key={s.id} to={`/espacio/${s.id}`} icon={<Dot color={s.color} size={7} />} onClick={onNavigate}>{s.name}</NavItem>)}
          </div>
          {personal.map((s) => <NavItem key={s.id} to={`/espacio/${s.id}`} icon={<User size={I} />} onClick={onNavigate}>{s.name}</NavItem>)}
        </div>
        <div className="space-y-0.5">
          <p className="kicker px-3 pb-1.5">Organización</p>
          <NavItem to="/notas" icon={<StickyNote size={I} />} onClick={onNavigate}>Notas e ideas</NavItem>
          <NavItem to="/proyectos" icon={<FolderKanban size={I} />} onClick={onNavigate}>Proyectos</NavItem>
          <NavItem to="/config" icon={<Settings size={I} />} onClick={onNavigate}>Configuración</NavItem>
        </div>
      </nav>
      <div className="flex items-center gap-1.5 px-3 pt-2 text-[11px] text-faint">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={syncing > 0 ? 's' : 'ok'} className="flex items-center gap-1.5" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
            {syncing > 0 ? <><CloudUpload size={13} className="animate-pulse text-accent-2" />Guardando…</> : <><Cloud size={13} className="text-ok" />Todo guardado y sincronizado</>}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}

function Bellbox() {
  const [open, setOpen] = useState(false)
  const reminders = useStore((s) => s.reminders)
  const nav = useNavigate()
  const next = reminders.filter((r) => new Date(r.fire_at).getTime() > Date.now()).slice(0, 12)
  return (
    <div className="relative">
      <button className="btn btn-ghost btn-icon relative" onClick={() => setOpen(!open)} aria-label="Próximos recordatorios">
        <Bell size={18} />
        {next.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />}
      </button>
      {open && <>
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
        <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.18, ease }} style={{ transformOrigin: 'top right' }}
          className="glass absolute right-0 top-11 z-40 w-[min(92vw,360px)] rounded-2xl border border-line p-2 shadow-2xl">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-semibold">Próximos avisos</span>
            <button className="text-xs text-accent-2 hover:underline" onClick={() => { setOpen(false); nav('/config#avisos') }}>Configurar</button>
          </div>
          {next.length === 0 && <p className="px-2 py-4 text-center text-xs text-muted">No hay avisos programados.</p>}
          <div className="max-h-80 overflow-y-auto">
            {next.map((r) => (
              <button key={r.id} className="block w-full rounded-xl px-2 py-2 text-left hover:bg-surface-2" onClick={() => { setOpen(false); nav(r.url) }}>
                <div className="truncate text-[13px] font-medium">{r.title}</div>
                <div className="text-[11px] text-muted">
                  {new Date(r.fire_at).toLocaleString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {ruleLabel(r.rule)}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </>}
    </div>
  )
}

function Toasts() {
  const toasts = useStore((s) => s.toasts)
  return (
    <div className="toasts pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
      {toasts.map((t) => (
        <motion.div key={t.id} layout initial={{ opacity: 0, y: -12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
          transition={{ type: 'spring', stiffness: 500, damping: 36 }}
          className={clsx('glass pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border px-4 py-2.5 text-sm shadow-2xl',
          t.tone === 'error' ? 'border-danger/40 bg-[#2a1416] text-red-100' : 'border-line-strong bg-surface-3 text-ink')}>
          <span>{t.text}</span>
          {t.action && <button className="font-semibold text-accent-2 hover:underline" onClick={() => { t.action!.run(); dismissToast(t.id) }}>{t.action.label}</button>}
        </motion.div>
      ))}
      </AnimatePresence>
    </div>
  )
}

function Modals() {
  const m = useStore((s) => s.modal)
  return <AnimatePresence>{m && <ModalSwitch key={m.type + (('id' in m && m.id) || '') + ('preset' in m ? JSON.stringify(m.preset ?? {}) : '')} />}</AnimatePresence>
}

function ModalSwitch() {
  const m = useStore((s) => s.modal)
  if (!m) return null
  if (m.type === 'task') return <TaskModal key={m.id ?? 'new' + JSON.stringify(m.preset ?? {})} id={m.id} preset={m.preset} />
  if (m.type === 'piece') return <PieceModal key={m.id ?? 'newp' + JSON.stringify(m.preset ?? {})} id={m.id} preset={m.preset} />
  if (m.type === 'note') return <NoteModal key={m.id ?? 'newn'} id={m.id} preset={m.preset} />
  if (m.type === 'capture') return <QuickCapture />
  if (m.type === 'search') return <SearchPalette />
  return null
}

/** Mientras el menú se cierra, deja pasar los toques */
function DrawerShell({ children }: { children: ReactNode }) {
  const present = useIsPresent()
  return <div className={clsx('fixed inset-0 z-50 lg:hidden', !present && 'pointer-events-none')}>{children}</div>
}

function usePullToRefresh() {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let y0: number | null = null
    let x0 = 0
    let current = 0
    const start = (e: TouchEvent) => {
      const t = e.target as HTMLElement
      // nunca empezar sobre botones, links, campos, la barra superior, menús o ventanas
      const blocked = t.closest('button,a,input,textarea,select,.topbar,nav,aside,[role=dialog],[role=button],[draggable]')
      y0 = !blocked && window.scrollY <= 0 && !useStore.getState().modal ? e.touches[0].clientY : null
      x0 = e.touches[0].clientX
      current = 0
    }
    const move = (e: TouchEvent) => {
      if (y0 === null) return
      const dy = e.touches[0].clientY - y0
      const dx = Math.abs(e.touches[0].clientX - x0)
      // solo cuenta un gesto claramente vertical hacia abajo
      if (dy < 12 || dx > dy) { if (current) { current = 0; setPull(0) } return }
      const v = Math.min(110, (dy - 12) * 0.55)
      if (Math.abs(v - current) >= 2) { current = v; setPull(v) }
    }
    const end = () => {
      if (y0 === null) return
      y0 = null
      if (current >= 70) { setBusy(true); loadAll().finally(() => setTimeout(() => setBusy(false), 350)) }
      if (current) setPull(0)
      current = 0
    }
    window.addEventListener('touchstart', start, { passive: true })
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', end)
    window.addEventListener('touchcancel', end)
    return () => {
      window.removeEventListener('touchstart', start); window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end); window.removeEventListener('touchcancel', end)
    }
  }, [])
  return { pull, busy }
}

export function Layout() {
  const [drawer, setDrawer] = useState(false)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const loc = useLocation()
  const outlet = useOutlet()
  useEffect(() => { window.scrollTo(0, 0); setDrawer(false) }, [loc.pathname])
  const { pull, busy } = usePullToRefresh()
  const accent = useStore((s) => s.profile?.accent)

  useEffect(() => {
    if (accent) {
      document.documentElement.style.setProperty('--accent', accent)
      document.documentElement.style.setProperty('--accent-2', `color-mix(in srgb, ${accent} 70%, white)`)
    }
  }, [accent])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openModal({ type: 'search' }); return }
      if (el.closest('input,textarea,select,[contenteditable]') || useStore.getState().modal || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'n') { e.preventDefault(); openModal({ type: 'task' }) }
      else if (e.key === 'c') { e.preventDefault(); openModal({ type: 'capture' }) }
      else if (e.key === '/') { e.preventDefault(); openModal({ type: 'search' }) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])


  const tab = (to: string, icon: ReactNode, label: string, end?: boolean) => (
    <NavLink to={to} end={end} className={({ isActive }) => clsx('relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10.5px] font-medium transition-colors', isActive ? 'text-ink' : 'text-faint')}>
      {({ isActive }) => <>
        {isActive && <motion.span layoutId="tab-active" className="absolute top-0 h-[3px] w-8 rounded-b-full" style={{ background: 'var(--accent)', boxShadow: '0 0 12px var(--accent)' }} transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
        <motion.span animate={{ scale: isActive ? 1.08 : 1, y: isActive ? -1 : 0 }} className={clsx(isActive && 'text-accent-2')}>{icon}</motion.span>{label}
      </>}
    </NavLink>
  )

  return (
    <div className="min-h-full">
      <aside className="glass-side fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-line px-2 py-4 lg:block no-print">
        <Sidebar />
      </aside>

      <AnimatePresence>
      {drawer && (
        <DrawerShell key="drawer">
          <motion.div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
          <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.24, ease }}
            onTouchStart={(e) => { swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
            onTouchEnd={(e) => {
              const t = e.changedTouches[0], st = swipe.current
              if (st && st.x - t.clientX > 70 && Math.abs(t.clientY - st.y) < 60) setDrawer(false)
              swipe.current = null
            }}
            className="absolute inset-y-0 left-0 w-[84vw] max-w-[300px] select-none border-r border-line bg-surface px-2 py-4 shadow-2xl" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
            <button className="btn btn-ghost absolute right-1 z-10 h-11 w-11 px-0" style={{ top: 'calc(0.25rem + env(safe-area-inset-top))' }} onClick={() => setDrawer(false)} aria-label="Cerrar menú"><X size={20} /></button>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </motion.aside>
        </DrawerShell>
      )}
      </AnimatePresence>

      <div className="lg:pl-[248px]">
        <header className="topbar sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-bg/80 px-3 backdrop-blur-md sm:px-6 no-print" style={{ paddingTop: 'env(safe-area-inset-top)' , height: 'calc(3.5rem + env(safe-area-inset-top))' }}>
          <button className="btn btn-ghost -ml-1 h-11 w-11 px-0 lg:hidden" onClick={() => setDrawer(true)} aria-label="Abrir menú"><Menu size={21} /></button>
          <button onClick={() => openModal({ type: 'search' })}
            className="flex h-9 flex-1 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 text-left text-[13px] text-faint transition-colors hover:border-line-strong sm:max-w-md">
            <Search size={15} /><span className="flex-1 truncate">Buscar…</span><kbd className="hidden rounded border border-line px-1.5 text-[10px] sm:inline">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <Bellbox />
            <button className="btn btn-primary hidden sm:inline-flex" onClick={() => openModal({ type: 'capture' })}><Plus size={16} />Crear</button>
          </div>
        </header>

        {(pull > 0 || busy) && (
          <div className="pointer-events-none fixed inset-x-0 z-30 flex justify-center lg:hidden" style={{ top: `calc(3.5rem + env(safe-area-inset-top) + ${busy ? 14 : pull / 4}px)` }}>
            <span className="glass grid h-9 w-9 place-items-center rounded-full border border-line shadow-lg" style={{ opacity: busy ? 1 : pull / 70 }}>
              <RefreshCw size={16} className={clsx('text-accent-2', busy && 'animate-spin')} style={busy ? undefined : { transform: `rotate(${pull * 3}deg)` }} />
            </span>
          </div>
        )}
        <motion.main key={loc.pathname} className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 lg:pb-12"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease }}>
          {outlet}
        </motion.main>
      </div>

      <nav className="glass fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line lg:hidden pb-safe no-print">
        {tab('/', <Home size={20} />, 'Panel', true)}
        {tab('/semana', <CalendarRange size={20} />, 'Semana')}
        <div className="flex flex-1 items-center justify-center">
          <motion.button whileTap={{ scale: 0.9, rotate: 90 }} onClick={() => openModal({ type: 'capture' })} aria-label="Captura rápida"
            className="-mt-6 grid h-14 w-14 place-items-center rounded-2xl text-white shadow-xl"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', boxShadow: '0 10px 30px -8px var(--accent)' }}>
            <Plus size={26} />
          </motion.button>
        </div>
        {tab('/editorial', <Clapperboard size={20} />, 'Contenido')}
        {tab('/tareas', <LayoutList size={20} />, 'Tareas')}
      </nav>

      <button onClick={() => openModal({ type: 'capture' })} aria-label="Captura rápida"
        className="fab-bottom fixed right-6 z-30 hidden h-14 w-14 place-items-center rounded-2xl text-white shadow-2xl transition-transform hover:scale-105 active:scale-95 lg:grid no-print"
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', boxShadow: '0 12px 34px -8px var(--accent)' }}>
        <Plus size={26} />
      </button>

      <Modals />
      <Toasts />
      <ConfettiLayer />
    </div>
  )
}
