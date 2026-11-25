import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
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
      className={({ isActive }) => clsx('group flex h-9 items-center gap-2.5 rounded-xl px-3 text-[13.5px] font-medium transition-colors',
        isActive ? 'bg-surface-3 text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink')}>
      {({ isActive }) => <>
        <span className={clsx('grid w-[18px] place-items-center', isActive && 'text-accent-2')}>{icon}</span>
        <span className="truncate">{children}</span>
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
        {syncing > 0 ? <><CloudUpload size={13} />Guardando…</> : <><Cloud size={13} />Todo guardado y sincronizado</>}
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
        <div className="absolute right-0 top-11 z-40 w-[min(92vw,360px)] rounded-2xl border border-line bg-surface p-2 shadow-2xl pop-in">
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
        </div>
      </>}
    </div>
  )
}

function Toasts() {
  const toasts = useStore((s) => s.toasts)
  return (
    <div style={{ marginBottom: 'var(--host-badge, 0px)' }} className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {toasts.map((t) => (
        <div key={t.id} className={clsx('pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border px-4 py-2.5 text-sm shadow-2xl pop-in',
          t.tone === 'error' ? 'border-danger/40 bg-[#2a1416] text-red-100' : 'border-line-strong bg-surface-3 text-ink')}>
          <span>{t.text}</span>
          {t.action && <button className="font-semibold text-accent-2 hover:underline" onClick={() => { t.action!.run(); dismissToast(t.id) }}>{t.action.label}</button>}
        </div>
      ))}
    </div>
  )
}

function Modals() {
  const m = useStore((s) => s.modal)
  if (!m) return null
  if (m.type === 'task') return <TaskModal key={m.id ?? 'new' + JSON.stringify(m.preset ?? {})} id={m.id} preset={m.preset} />
  if (m.type === 'piece') return <PieceModal key={m.id ?? 'newp' + JSON.stringify(m.preset ?? {})} id={m.id} preset={m.preset} />
  if (m.type === 'note') return <NoteModal key={m.id ?? 'newn'} id={m.id} preset={m.preset} />
  if (m.type === 'capture') return <QuickCapture />
  if (m.type === 'search') return <SearchPalette />
  return null
}

export function Layout() {
  const [drawer, setDrawer] = useState(false)
  const loc = useLocation()
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

  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])

  const tab = (to: string, icon: ReactNode, label: string, end?: boolean) => (
    <NavLink to={to} end={end} className={({ isActive }) => clsx('flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10.5px] font-medium', isActive ? 'text-ink' : 'text-faint')}>
      {({ isActive }) => <><span className={clsx(isActive && 'text-accent-2')}>{icon}</span>{label}</>}
    </NavLink>
  )

  return (
    <div className="min-h-full">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-line bg-surface/80 px-2 py-4 backdrop-blur lg:block no-print">
        <Sidebar />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 fade-in" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[84vw] max-w-[300px] border-r border-line bg-surface px-2 py-4 pop-in">
            <button className="btn btn-ghost btn-icon absolute right-2 top-3" onClick={() => setDrawer(false)} aria-label="Cerrar menú"><X size={18} /></button>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-bg/80 px-3 backdrop-blur-md sm:px-6 no-print" style={{ paddingTop: 'env(safe-area-inset-top)' , height: 'calc(3.5rem + env(safe-area-inset-top))' }}>
          <button className="btn btn-ghost btn-icon lg:hidden" onClick={() => setDrawer(true)} aria-label="Abrir menú"><Menu size={19} /></button>
          <button onClick={() => openModal({ type: 'search' })}
            className="flex h-9 flex-1 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 text-left text-[13px] text-faint transition-colors hover:border-line-strong sm:max-w-md">
            <Search size={15} /><span className="flex-1 truncate">Buscar…</span><kbd className="hidden rounded border border-line px-1.5 text-[10px] sm:inline">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <Bellbox />
            <button className="btn btn-primary hidden sm:inline-flex" onClick={() => openModal({ type: 'capture' })}><Plus size={16} />Crear</button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 lg:pb-12 fade-in" key={loc.pathname}>
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-surface/95 backdrop-blur-md lg:hidden pb-safe no-print">
        {tab('/', <Home size={20} />, 'Panel', true)}
        {tab('/semana', <CalendarRange size={20} />, 'Semana')}
        <div className="flex flex-1 items-center justify-center">
          <button onClick={() => openModal({ type: 'capture' })} aria-label="Captura rápida"
            className="-mt-6 grid h-14 w-14 place-items-center rounded-2xl text-white shadow-xl active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', boxShadow: '0 10px 30px -8px var(--accent)' }}>
            <Plus size={26} />
          </button>
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
    </div>
  )
}
