import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { WeekGrid, WeekCard, itemKey } from '../components/Calendar'
import { PageHead, Segmented, Dot } from '../components/ui'
import { addDaysKey, fmt, fmtMinutes, todayKey, weekDays } from '../lib/dates'
import { useAgenda, useSpaces } from '../lib/selectors'
import { openModal, useStore } from '../lib/store'

type F = 'all' | 'fijo' | 'cliente' | 'personal' | 'contenido'

export default function Semana() {
  const [anchor, setAnchor] = useState(todayKey())
  const [f, setF] = useState<F>('all')
  const [space, setSpace] = useState('all')
  const profile = useStore((s) => s.profile)
  const spaces = useSpaces()
  const all = useAgenda()
  const days = weekDays(anchor)
  const T = todayKey()

  const filtered = useMemo(() => all.filter((i) => {
    if (space !== 'all' && i.space?.id !== space) return false
    if (f === 'contenido') return i.kind === 'piece'
    if (f === 'all') return true
    return i.space?.kind === f
  }), [all, f, space])
  const week = filtered.filter((i) => i.date >= days[0] && i.date <= days[6])
  const overdueAll = filtered.filter((i) => i.overdue && i.date < T)
  const mins = week.filter((i) => i.kind === 'task' && !i.done).reduce((a, i) => a + i.minutes, 0)
  const capacity = (profile?.work_hours_per_day ?? 8) * 5 * 60
  const pubs = week.filter((i) => i.kind === 'piece')
  const perSpace = spaces.map((s) => ({ s, n: week.filter((i) => i.space?.id === s.id && !i.done).length })).filter((x) => x.n)

  return (
    <>
      <PageHead kicker={`${fmt(days[0], "d 'de' MMM")} – ${fmt(days[6], "d 'de' MMM")}`} title="Mi semana">
        <button className="btn btn-icon" onClick={() => setAnchor(addDaysKey(anchor, -7))} aria-label="Semana anterior"><ChevronLeft size={17} /></button>
        <button className="btn" onClick={() => setAnchor(T)}>Esta semana</button>
        <button className="btn btn-icon" onClick={() => setAnchor(addDaysKey(anchor, 7))} aria-label="Semana siguiente"><ChevronRight size={17} /></button>
      </PageHead>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <div className="card p-3 sm:p-5"><div className="text-[12px] text-muted">Pendientes de la semana</div><div className="mt-1 text-2xl font-semibold tabular-nums">{week.filter((i) => !i.done).length}</div></div>
        <div className="card p-3 sm:p-5"><div className="text-[12px] text-muted">Publicadas</div><div className="mt-1 text-2xl font-semibold tabular-nums">{pubs.filter((p) => p.done).length}<span className="text-sm text-muted"> / {pubs.length}</span></div></div>
        <div className={clsx('card p-3 sm:p-5', mins > capacity && 'border-warn/50')}>
          <div className="text-[12px] text-muted">Carga estimada</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{fmtMinutes(mins)}</div>
          <div className={clsx('text-xs', mins > capacity ? 'font-medium text-warn' : 'text-faint')}>{mins > capacity ? '¡Estás sobrecargada esta semana!' : `de ${Math.round(capacity / 60)} h disponibles`}</div>
        </div>
        <div className="card p-3 sm:p-5">
          <div className="text-[12px] text-muted">Por espacio</div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">{perSpace.length ? perSpace.map(({ s, n }) => <span key={s.id} className="inline-flex items-center gap-1.5"><Dot color={s.color} size={6} />{s.name} <b>{n}</b></span>) : <span className="text-faint">Semana libre</span>}</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="overflow-x-auto no-scrollbar"><Segmented value={f} onChange={setF} options={[['all', 'Todo'], ['fijo', 'Trabajo fijo'], ['cliente', 'Freelance'], ['personal', 'Personal'], ['contenido', 'Publicaciones']]} /></div>
        <select className="input h-9 w-auto text-[13px]" value={space} onChange={(e) => setSpace(e.target.value)} aria-label="Espacio">
          <option value="all">Todos los espacios</option>
          {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {overdueAll.length > 0 && days[0] <= T && T <= days[6] && (
        <section className="card mb-4 border-danger/30 p-3">
          <div className="mb-2 flex items-center gap-2 px-1 text-[13px] font-semibold text-danger"><AlertTriangle size={15} />Atrasadas ({overdueAll.length}) — abrilas para reprogramar</div>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">{overdueAll.slice(0, 8).map((i) => <WeekCard key={itemKey(i)} item={i} />)}</div>
        </section>
      )}

      <WeekGrid days={days} items={week} hoursPerDay={profile?.work_hours_per_day}
        onAdd={(k) => openModal(f === 'contenido' ? { type: 'piece', preset: { publish_date: k } } : { type: 'task', preset: { due_date: k } })} />
      <p className="mt-3 text-xs text-faint">Mantené apretado (celular) o arrastrá (computadora) para mover algo a otro día. Toda su información se conserva.</p>
    </>
  )
}
