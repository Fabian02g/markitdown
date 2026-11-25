import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Plus, Search, X, ListTodo } from 'lucide-react'
import { PRIORITY, TASK_STATUS, TASK_STATUS_ORDER } from '../lib/constants'
import { addDaysKey, fmt, relDay, todayKey, weekDays } from '../lib/dates'
import { byDue, isTaskOverdue, normalize, toAgenda, useSpaceMap, useSpaces } from '../lib/selectors'
import { openModal, saveTask, useStore } from '../lib/store'
import type { Priority, Task, TaskStatus } from '../lib/types'
import { TaskRow } from './TaskRow'
import { DnD, Draggable, Droppable } from './dnd'
import { DayList, MonthGrid, MonthNav, WeekGrid } from './Calendar'
import { Empty, Segmented } from './ui'

export type DateFilter = 'all' | 'today' | 'overdue' | 'week' | 'none' | 'done'
type View = 'list' | 'kanban' | 'calendar'
type CalMode = 'month' | 'week' | 'day'

const readPref = <T,>(k: string, d: T): T => { try { return (localStorage.getItem(k) as T) || d } catch { return d } }
const writePref = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* sin almacenamiento */ } }

export function TaskExplorer({ spaceId, initialDate = 'all', lockKind }: { spaceId?: string; initialDate?: DateFilter; lockKind?: 'fijo' | 'cliente' | 'personal' | 'proyecto' }) {
  const tasks = useStore((s) => s.tasks)
  const spaces = useSpaces()
  const map = useSpaceMap()
  const profile = useStore((s) => s.profile)
  const [view, setView] = useState<View>(() => readPref('taskView', 'list'))
  const [cal, setCal] = useState<CalMode>('month')
  const [month, setMonth] = useState(todayKey().slice(0, 7))
  const [day, setDay] = useState(todayKey())
  const [q, setQ] = useState('')
  const [fSpace, setFSpace] = useState<string>('all')
  const [fStatus, setFStatus] = useState<TaskStatus | 'all' | 'open'>(initialDate === 'done' ? 'done' : 'open')
  const [fPrio, setFPrio] = useState<Priority | 'all'>('all')
  const [fCat, setFCat] = useState('all')
  const [fDate, setFDate] = useState<DateFilter>(initialDate === 'done' ? 'all' : initialDate)
  const [fKind, setFKind] = useState<'all' | 'fijo' | 'cliente' | 'personal' | 'proyecto'>(lockKind ?? 'all')

  const changeView = (v: View) => { setView(v); writePref('taskView', v) }

  const categories = useMemo(() => [...new Set(tasks.map((t) => t.category).filter(Boolean))].sort(), [tasks])

  const filtered = useMemo(() => {
    const T = todayKey(), W = addDaysKey(T, 7), n = normalize(q.trim())
    return tasks.filter((t) => {
      if (spaceId && t.space_id !== spaceId) return false
      if (!spaceId && fSpace !== 'all' && t.space_id !== fSpace) return false
      if (!spaceId && fKind !== 'all' && (t.space_id ? map.get(t.space_id)?.kind : undefined) !== fKind) return false
      if (fStatus === 'open' && t.status === 'done') return false
      if (fStatus !== 'all' && fStatus !== 'open' && t.status !== fStatus) return false
      if (fPrio !== 'all' && t.priority !== fPrio) return false
      if (fCat !== 'all' && t.category !== fCat) return false
      if (fDate === 'today' && t.due_date !== T) return false
      if (fDate === 'overdue' && !isTaskOverdue(t)) return false
      if (fDate === 'week' && !(t.due_date && t.due_date >= T && t.due_date <= W)) return false
      if (fDate === 'none' && t.due_date) return false
      if (n && ![t.title, t.description, t.notes, t.category, t.tags.join(' ')].some((x) => normalize(x).includes(n))) return false
      return true
    }).sort(byDue)
  }, [tasks, spaceId, fSpace, fKind, fStatus, fPrio, fCat, fDate, q, map])

  const active = [fSpace !== 'all', fStatus !== 'open', fPrio !== 'all', fCat !== 'all', fDate !== 'all', !lockKind && fKind !== 'all', !!q].filter(Boolean).length
  const reset = () => { setFSpace('all'); setFStatus('open'); setFPrio('all'); setFCat('all'); setFDate('all'); setFKind(lockKind ?? 'all'); setQ('') }
  const newTask = (preset: Partial<Task> = {}) => openModal({ type: 'task', preset: { ...(spaceId ? { space_id: spaceId } : {}), ...preset } })

  // agrupar la lista por fecha
  const groups = useMemo(() => {
    const T = todayKey()
    const g = new Map<string, Task[]>()
    for (const t of filtered) {
      const k = !t.due_date ? 'Sin fecha' : isTaskOverdue(t) && t.due_date < T ? 'Vencidas' : t.due_date === T ? 'Hoy' : relDay(t.due_date)
      g.set(k, [...(g.get(k) ?? []), t])
    }
    const order = (k: string) => (k === 'Vencidas' ? 0 : k === 'Hoy' ? 1 : k === 'Sin fecha' ? 3 : 2)
    return [...g.entries()].sort((a, b) => order(a[0]) - order(b[0]))
  }, [filtered])

  const agenda = useMemo(() => toAgenda(filtered, [], map), [filtered, map])

  const sel = 'input h-9 w-auto min-w-0 text-[13px]'

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input className="input h-9 pl-9 text-[13px]" placeholder="Buscar tareas…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Segmented value={view} onChange={changeView} options={[['list', 'Lista'], ['kanban', 'Columnas'], ['calendar', 'Calendario']]} />
        <button className="btn btn-primary ml-auto" onClick={() => newTask()}><Plus size={16} />Tarea</button>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {!spaceId && !lockKind && (
          <select className={sel} value={fKind} onChange={(e) => setFKind(e.target.value as typeof fKind)} aria-label="Tipo de espacio">
            <option value="all">Todos los espacios</option><option value="fijo">Trabajo fijo</option><option value="cliente">Freelance</option><option value="personal">Personal</option><option value="proyecto">Proyectos</option>
          </select>
        )}
        {!spaceId && (
          <select className={sel} value={fSpace} onChange={(e) => setFSpace(e.target.value)} aria-label="Cliente o espacio">
            <option value="all">Cualquier cliente</option>
            {spaces.filter((s) => !lockKind || s.kind === lockKind).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <select className={sel} value={fStatus} onChange={(e) => setFStatus(e.target.value as typeof fStatus)} aria-label="Estado">
          <option value="open">Abiertas</option><option value="all">Todas</option>
          {TASK_STATUS_ORDER.map((k) => <option key={k} value={k}>{TASK_STATUS[k].label}</option>)}
        </select>
        <select className={sel} value={fPrio} onChange={(e) => setFPrio(e.target.value as typeof fPrio)} aria-label="Prioridad">
          <option value="all">Cualquier prioridad</option>
          {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className={sel} value={fCat} onChange={(e) => setFCat(e.target.value)} aria-label="Categoría">
          <option value="all">Cualquier categoría</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={sel} value={fDate} onChange={(e) => setFDate(e.target.value as DateFilter)} aria-label="Fecha">
          <option value="all">Cualquier fecha</option><option value="today">Hoy</option><option value="overdue">Vencidas</option><option value="week">Próximos 7 días</option><option value="none">Sin fecha</option>
        </select>
        {active > 0 && <button className="btn btn-ghost btn-sm shrink-0" onClick={reset}><X size={14} />Limpiar ({active})</button>}
      </div>

      {view === 'list' && (
        <div className="card p-2">
          {filtered.length === 0 && <Empty icon={<ListTodo size={20} />} title="No hay tareas con estos filtros"><button className="btn btn-sm mt-2" onClick={() => newTask()}><Plus size={14} />Crear tarea</button></Empty>}
          {groups.map(([label, list]) => (
            <div key={label} className="mb-2 last:mb-0">
              <div className={clsx('flex items-center gap-2 px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider', label === 'Vencidas' ? 'text-danger' : 'text-muted')}>
                {label}<span className="text-faint">{list.length}</span>
              </div>
              {list.map((t) => <TaskRow key={t.id} task={t} showSpace={!spaceId} />)}
            </div>
          ))}
        </div>
      )}

      {view === 'kanban' && <Kanban tasks={filtered} onAdd={(status) => newTask({ status })} showSpace={!spaceId} />}

      {view === 'calendar' && (
        <div className="card card-pad">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Segmented value={cal} onChange={setCal} options={[['month', 'Mes'], ['week', 'Semana'], ['day', 'Día']]} />
            {cal === 'week' && (
              <div className="flex items-center gap-2">
                <button className="btn btn-sm" onClick={() => setDay(addDaysKey(day, -7))}>‹</button>
                <span className="text-sm font-medium">{fmt(weekDays(day)[0], 'd MMM')} – {fmt(weekDays(day)[6], 'd MMM')}</span>
                <button className="btn btn-sm" onClick={() => setDay(addDaysKey(day, 7))}>›</button>
                <button className="btn btn-sm" onClick={() => setDay(todayKey())}>Hoy</button>
              </div>
            )}
          </div>
          <div className="mt-3">
            {cal === 'month' && <><MonthNav month={month} onChange={setMonth} /><MonthGrid month={month} items={agenda} onDayClick={(k) => { setDay(k); setCal('day') }} /></>}
            {cal === 'week' && <WeekGrid days={weekDays(day)} items={agenda} onAdd={(k) => newTask({ due_date: k })} hoursPerDay={profile?.work_hours_per_day} />}
            {cal === 'day' && <DayList date={day} items={agenda} onPrev={() => setDay(addDaysKey(day, -1))} onNext={() => setDay(addDaysKey(day, 1))} />}
          </div>
          <p className="mt-3 text-xs text-faint">Arrastrá una tarea a otro día para moverla. Tocá un día para verlo en detalle.</p>
        </div>
      )}
    </div>
  )
}

function Kanban({ tasks, onAdd, showSpace }: { tasks: Task[]; onAdd: (s: TaskStatus) => void; showSpace: boolean }) {
  const all = new Map(tasks.map((t) => [t.id, t]))
  return (
    <DnD
      onDrop={(id, col) => { const t = all.get(id); const st = col.replace('col:', '') as TaskStatus; if (t && t.status !== st) saveTask({ id, status: st }) }}
      overlay={(id) => all.get(id) && <div className="w-72 rounded-xl border border-line bg-surface-2 shadow-2xl"><TaskRow task={all.get(id)!} compact /></div>}
    >
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 md:grid md:grid-cols-4 md:overflow-visible">
        {TASK_STATUS_ORDER.map((st) => {
          const list = tasks.filter((t) => t.status === st)
          return (
            <Droppable key={st} id={`col:${st}`} className="w-[82vw] shrink-0 snap-start rounded-2xl sm:w-[320px] md:w-auto">
              <div className="flex h-full min-h-[300px] flex-col rounded-2xl border border-line bg-surface p-2">
                <div className="mb-2 flex items-center gap-2 px-2 pt-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: TASK_STATUS[st].color }} />
                  <span className="text-[13px] font-semibold">{TASK_STATUS[st].label}</span>
                  <span className="text-xs text-faint">{list.length}</span>
                  <button className="btn btn-ghost btn-icon btn-sm ml-auto" onClick={() => onAdd(st)} aria-label={`Agregar en ${TASK_STATUS[st].label}`}><Plus size={15} /></button>
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  {list.map((t) => (
                    <Draggable key={t.id} id={t.id}>
                      <div className="rounded-xl border border-line bg-surface-2 transition-colors hover:border-line-strong"><TaskRow task={t} compact showSpace={showSpace} /></div>
                    </Draggable>
                  ))}
                  {!list.length && <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-line text-xs text-faint">Soltá tareas acá</div>}
                </div>
              </div>
            </Droppable>
          )
        })}
      </div>
    </DnD>
  )
}
