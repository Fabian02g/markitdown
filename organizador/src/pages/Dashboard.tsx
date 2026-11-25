import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { CountUp, celebrate, rise, stagger } from '../components/motion'
import { Link, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Megaphone, Pencil, Plus, Star, Target } from 'lucide-react'
import { addDaysKey, fmt, fmtMinutes, greeting, monthMatrix, todayKey, weekDays, WEEKDAYS_SHORT, cap } from '../lib/dates'
import { byDue, isTaskOverdue, spaceStats, useAgenda, useSpaces, type AgendaItem } from '../lib/selectors'
import { openModal, saveProfile, useStore } from '../lib/store'
import { PHRASES, PIECE_TYPE } from '../lib/constants'
import { TaskRow } from '../components/TaskRow'
import { WeekCard, itemKey } from '../components/Calendar'
import { Dot, Empty, Progress } from '../components/ui'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function Stat({ icon, label, value, tone, onClick }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: string; onClick?: () => void }) {
  return (
    <motion.button variants={rise} whileTap={{ scale: 0.97 }} onClick={onClick} className="card glow-hover group flex flex-col items-start gap-2 p-3 text-left transition-colors hover:border-line-strong sm:gap-3 sm:p-5">
      <span className="grid h-7 w-7 place-items-center rounded-lg sm:h-9 sm:w-9 sm:rounded-xl" style={{ background: `color-mix(in srgb, ${tone ?? 'var(--accent)'} 16%, transparent)`, color: tone ?? 'var(--accent-2)' }}>{icon}</span>
      <div>
        <div className="text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">{typeof value === 'number' ? <CountUp value={value} /> : value}</div>
        <div className="text-[11px] leading-tight text-muted sm:text-[12px]">{label}</div>
      </div>
    </motion.button>
  )
}

function MiniCalendar({ items }: { items: AgendaItem[] }) {
  const nav = useNavigate()
  const t = todayKey()
  const ym = t.slice(0, 7)
  const busy = new Map<string, number>()
  items.forEach((i) => !i.done && busy.set(i.date, (busy.get(i.date) ?? 0) + 1))
  return (
    <div className="card card-pad">
      <div className="mb-3 flex items-center justify-between"><h2 className="h2">{cap(format(new Date(), 'MMMM', { locale: es }))}</h2><Link to="/agenda" className="text-xs text-accent-2 hover:underline">Agenda</Link></div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS_SHORT.map((d) => <div key={d} className="text-[10px] font-semibold uppercase text-faint">{d.charAt(0)}</div>)}
        {monthMatrix(ym).map((k) => {
          const n = busy.get(k) ?? 0
          return (
            <button key={k} onClick={() => nav(`/agenda?d=${k}`)}
              className={clsx('relative grid aspect-square place-items-center rounded-lg text-[12px] tabular-nums transition-colors hover:bg-surface-2',
                k.slice(0, 7) !== ym && 'text-faint', k === t && 'font-bold text-white')}
              style={k === t ? { background: 'var(--accent)' } : undefined}>
              {Number(k.slice(8))}
              {n > 0 && k !== t && <span className="absolute bottom-1 h-1 w-1 rounded-full" style={{ background: n > 3 ? 'var(--warn)' : 'var(--accent-2)' }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const profile = useStore((s) => s.profile)
  const tasks = useStore((s) => s.tasks)
  const pieces = useStore((s) => s.pieces)
  const spaces = useSpaces()
  const agenda = useAgenda()
  const nav = useNavigate()
  const [editPhrase, setEditPhrase] = useState(false)
  const [goalEdit, setGoalEdit] = useState(false)
  const T = todayKey()
  const tm = addDaysKey(T, 1)
  const wk = weekDays(T)

  const d = useMemo(() => {
    const todayTasks = tasks.filter((t) => t.due_date === T)
    const pending = todayTasks.filter((t) => t.status !== 'done')
    const overdue = tasks.filter((t) => isTaskOverdue(t))
    const doneToday = tasks.filter((t) => t.status === 'done' && t.completed_at && t.completed_at.slice(0, 10) === T)
    const pubsToday = pieces.filter((p) => p.publish_date === T)
    const pubsWeek = pieces.filter((p) => p.publish_date && p.publish_date >= wk[0] && p.publish_date <= wk[6] && p.status !== 'publicado')
    const minutes = pending.reduce((a, t) => a + (t.estimate_min || 0), 0)
    const open = tasks.filter((t) => t.status !== 'done')
    const top = [...open.filter((t) => t.is_top), ...open.filter((t) => !t.is_top && (t.due_date ?? '9999') <= T).sort(byDue)]
      .filter((t, i, a) => a.findIndex((x) => x.id === t.id) === i).slice(0, 3)
    const doneWeek = tasks.filter((t) => t.status === 'done' && t.completed_at && t.completed_at.slice(0, 10) >= wk[0] && t.completed_at.slice(0, 10) <= wk[6]).length
      + pieces.filter((p) => p.status === 'publicado' && p.published_at && p.published_at.slice(0, 10) >= wk[0] && p.published_at.slice(0, 10) <= wk[6]).length
    return { pending, overdue, doneToday, pubsToday, pubsWeek, minutes, top, doneWeek }
  }, [tasks, pieces, T, wk])

  // Festejo al completar todas las prioridades del día
  const prevTop = useRef(d.top.length)
  useEffect(() => {
    if (prevTop.current > 0 && d.top.length === 0 && d.doneToday.length > 0) celebrate()
    prevTop.current = d.top.length
  }, [d.top.length, d.doneToday.length])

  const today = agenda.filter((i) => i.date === T)
  const upcoming = agenda.filter((i) => !i.done && i.date > T && i.date <= addDaysKey(T, 14))
  const groups: [string, AgendaItem[]][] = [
    ['Mañana', upcoming.filter((i) => i.date === tm)],
    ['Esta semana', upcoming.filter((i) => i.date > tm && i.date <= wk[6])],
    ['Próximamente', upcoming.filter((i) => i.date > wk[6])],
  ]
  // entregas: tareas con fecha + piezas con fecha de entrega
  const deliveries = pieces.filter((p) => p.delivery_date && p.delivery_date >= T && p.delivery_date <= addDaysKey(T, 7) && !['aprobado', 'programado', 'publicado'].includes(p.status))

  const goal = profile?.weekly_goal_target || 10
  const phrase = profile?.phrase || PHRASES[0]

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <section className="card accent-glow overflow-hidden p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="kicker mb-2">{fmt(T, "EEEE d 'de' MMMM")}</div>
            <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="text-[26px] font-semibold tracking-tight sm:text-[32px]">
              {greeting()}, <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, var(--text), var(--accent-2))' }}>{profile?.display_name || 'vos'}</span>
            </motion.h1>
            {editPhrase ? (
              <input autoFocus className="input mt-2 max-w-xl" defaultValue={phrase}
                onBlur={(e) => { setEditPhrase(false); if (e.target.value.trim() && e.target.value !== phrase) saveProfile({ phrase: e.target.value.trim() }) }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
            ) : (
              <button className="group mt-2 flex items-center gap-2 text-left text-[14px] text-muted hover:text-ink" onClick={() => setEditPhrase(true)}>
                “{phrase}” <Pencil size={13} className="opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn" onClick={() => openModal({ type: 'piece', preset: { publish_date: T } })}><Megaphone size={15} />Contenido</button>
            <button className="btn btn-primary" onClick={() => openModal({ type: 'task' })}><Plus size={16} />Nueva tarea</button>
          </div>
        </div>
      </section>

      {/* Resumen */}
      <motion.section variants={stagger} initial="hidden" animate="show" className="grid grid-cols-3 gap-2 sm:gap-3 xl:grid-cols-6">
        <Stat icon={<CalendarClock size={18} />} label="Pendientes hoy" value={d.pending.length} onClick={() => nav('/tareas?f=today')} />
        <Stat icon={<CheckCircle2 size={18} />} label="Completadas hoy" value={d.doneToday.length} tone="var(--ok)" onClick={() => nav('/tareas?f=done')} />
        <Stat icon={<AlertTriangle size={18} />} label="Vencidas" value={d.overdue.length} tone={d.overdue.length ? 'var(--danger)' : '#71717a'} onClick={() => nav('/tareas?f=overdue')} />
        <Stat icon={<Clock size={18} />} label="Entregas (7 días)" value={deliveries.length + tasks.filter((t) => t.status !== 'done' && t.due_date && t.due_date > T && t.due_date <= addDaysKey(T, 7)).length} tone="#38bdf8" onClick={() => nav('/semana')} />
        <Stat icon={<Megaphone size={18} />} label="Publicaciones semana" value={d.pubsWeek.length} tone="#f472b6" onClick={() => nav('/editorial')} />
        <Stat icon={<Target size={18} />} label="Estimado hoy" value={fmtMinutes(d.minutes)} tone="#facc15" onClick={() => nav('/semana')} />
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* Prioridades */}
          <section className="card card-pad">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="h2 flex items-center gap-2"><Star size={16} className="text-accent-2" />Mis prioridades de hoy</h2>
              <span className="text-xs text-muted">Marcá ⭐ en una tarea para fijarla acá</span>
            </div>
            {d.top.length === 0
              ? <Empty title="Sin prioridades para hoy">Agregá una tarea y marcala como prioridad del día.</Empty>
              : <div className="grid gap-2 md:grid-cols-3">
                  {d.top.map((t, i) => (
                    <motion.div layout key={t.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      className="rounded-xl border border-line bg-surface-2 p-1">
                      <div className="px-3 pt-2 text-[11px] font-semibold text-accent-2">#{i + 1}</div>
                      <TaskRow task={t} compact />
                    </motion.div>
                  ))}
                </div>}
          </section>

          {/* Agenda de hoy */}
          <section className="card card-pad">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="h2">Agenda de hoy</h2>
              <Link to="/agenda" className="text-xs text-accent-2 hover:underline">Ver agenda</Link>
            </div>
            {today.length === 0 && d.overdue.length === 0
              ? <Empty title="Día libre">No tenés nada agendado para hoy.</Empty>
              : <div className="space-y-1.5">
                  {d.overdue.filter((t) => t.due_date !== T).slice(0, 5).map((t) => <TaskRow key={t.id} task={t} />)}
                  {today.map((i) => (
                    <div key={itemKey(i)} className="flex gap-3">
                      <div className="w-11 shrink-0 pt-2.5 text-right text-xs tabular-nums text-muted">{i.time || '—'}</div>
                      <div className="flex-1"><WeekCard item={i} /></div>
                    </div>
                  ))}
                </div>}
          </section>

          {/* Espacios */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="h2">Mis espacios</h2>
              <Link to="/clientes" className="text-xs text-accent-2 hover:underline">Gestionar clientes</Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {spaces.filter((s) => s.kind !== 'proyecto').map((s) => {
                const st = spaceStats(s.id, tasks, pieces)
                const total = st.pending + st.done
                return (
                  <Link key={s.id} to={`/espacio/${s.id}`} className="card card-pad glow-hover group relative overflow-hidden">
                    <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: s.color }} />
                    <div className="mb-3 flex items-center gap-2"><Dot color={s.color} /><span className="font-semibold">{s.name}</span>
                      <span className="ml-auto text-[11px] text-muted">{s.kind === 'cliente' ? 'Freelance' : s.kind === 'fijo' ? 'Trabajo fijo' : 'Personal'}</span></div>
                    <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                      <div><div className="text-lg font-semibold tabular-nums">{st.pending}</div><div className="text-[11px] text-muted">Pendientes</div></div>
                      <div><div className="text-lg font-semibold tabular-nums text-ok">{st.done}</div><div className="text-[11px] text-muted">Hechas</div></div>
                      <div><div className={clsx('text-lg font-semibold tabular-nums', st.overdue ? 'text-danger' : 'text-faint')}>{st.overdue}</div><div className="text-[11px] text-muted">Vencidas</div></div>
                    </div>
                    <Progress value={total ? (st.done / total) * 100 : 0} color={s.color} />
                  </Link>
                )
              })}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          {/* Objetivo semanal */}
          <section className="card card-pad">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="h2 flex items-center gap-2"><Target size={16} className="text-accent-2" />Objetivo semanal</h2>
              <button className="text-xs text-accent-2 hover:underline" onClick={() => setGoalEdit(!goalEdit)}>{goalEdit ? 'Listo' : 'Editar'}</button>
            </div>
            {goalEdit ? (
              <div className="space-y-2">
                <input className="input" placeholder="Ej.: Terminar el PDP de diciembre" defaultValue={profile?.weekly_goal_text}
                  onBlur={(e) => saveProfile({ weekly_goal_text: e.target.value })} />
                <label className="flex items-center gap-2 text-xs text-muted">Meta: completar
                  <input type="number" min={1} className="input h-8 w-20" defaultValue={goal} onBlur={(e) => saveProfile({ weekly_goal_target: Math.max(1, Number(e.target.value) || 1) })} />
                  tareas/publicaciones</label>
              </div>
            ) : (
              <p className="mb-3 text-sm text-muted">{profile?.weekly_goal_text || 'Definí una meta para esta semana.'}</p>
            )}
            <div className="mb-1.5 mt-3 flex items-baseline justify-between"><span className="text-2xl font-semibold tabular-nums">{d.doneWeek}<span className="text-sm text-muted"> / {goal}</span></span><span className="text-xs text-muted">{Math.min(100, Math.round((d.doneWeek / goal) * 100))}%</span></div>
            <Progress value={(d.doneWeek / goal) * 100} />
          </section>

          {/* Hoy sale */}
          <section className="card card-pad">
            <div className="mb-3 flex items-center justify-between"><h2 className="h2 flex items-center gap-2"><Megaphone size={16} className="text-accent-2" />Hoy sale</h2><Link to="/hoy" className="text-xs text-accent-2 hover:underline">Ver todo</Link></div>
            {d.pubsToday.length === 0 ? <p className="text-sm text-muted">No hay publicaciones para hoy.</p> : (
              <div className="space-y-1.5">
                {agenda.filter((i) => i.kind === 'piece' && i.date === T).map((i) => <WeekCard key={i.id} item={i} />)}
              </div>
            )}
          </section>

          {/* Próximos vencimientos */}
          <section className="card card-pad">
            <h2 className="h2 mb-3">Próximos vencimientos</h2>
            {groups.every(([, l]) => !l.length) && deliveries.length === 0 && <p className="text-sm text-muted">Nada en las próximas dos semanas.</p>}
            {deliveries.length > 0 && (
              <div className="mb-3">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Entregas a clientes</div>
                {deliveries.map((p) => (
                  <button key={p.id} onClick={() => openModal({ type: 'piece', id: p.id })} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-surface-2">
                    <Dot color={spaces.find((s) => s.id === p.space_id)?.color ?? '#888'} size={6} />
                    <span className="flex-1 truncate">{PIECE_TYPE[p.type].label}: {p.title}</span>
                    <span className="text-xs text-muted">{fmt(p.delivery_date!, 'EEE d')}</span>
                  </button>
                ))}
              </div>
            )}
            {groups.map(([label, list]) => list.length > 0 && (
              <div key={label} className="mb-3 last:mb-0">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</div>
                {list.slice(0, 6).map((i) => (
                  <button key={itemKey(i)} onClick={() => openModal(i.kind === 'task' ? { type: 'task', id: i.id } : { type: 'piece', id: i.id })}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-surface-2">
                    <Dot color={i.space?.color ?? '#888'} size={6} />
                    <span className="flex-1 truncate">{i.kind === 'piece' ? '📣 ' : ''}{i.title}</span>
                    <span className="text-xs tabular-nums text-muted">{fmt(i.date, 'EEE d')}{i.time ? ' ' + i.time : ''}</span>
                  </button>
                ))}
                {list.length > 6 && <Link to="/semana" className="px-2 text-xs text-muted hover:text-ink">+{list.length - 6} más</Link>}
              </div>
            ))}
          </section>

          <MiniCalendar items={agenda} />
        </div>
      </div>
    </div>
  )
}
