import { useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight, CheckSquare2, Users } from 'lucide-react'
import { WEEKDAYS_SHORT, monthLabel, monthMatrix, shiftMonth, todayKey, fmt, addDaysKey } from '../lib/dates'
import type { AgendaItem } from '../lib/selectors'
import { openModal, savePiece, saveTask, toggleTask } from '../lib/store'
import { PIECE_STATUS } from '../lib/constants'
import { DnD, Draggable, Droppable } from './dnd'
import { TypeIcon } from './TypeIcon'
import { CheckCircle, Dot, Modal } from './ui'
import { Plus } from 'lucide-react'

export const itemKey = (i: AgendaItem) => `${i.kind}:${i.id}`

export function openItem(i: AgendaItem) {
  openModal(i.kind === 'task' ? { type: 'task', id: i.id } : { type: 'piece', id: i.id })
}

/** Mover un elemento a otro día sin perder su información */
export async function moveItemTo(dragId: string, date: string) {
  const [kind, id] = dragId.split(':')
  if (kind === 'task') await saveTask({ id, due_date: date })
  else if (kind === 'piece') await savePiece({ id, publish_date: date })
}

export function AgendaChip({ item, dense }: { item: AgendaItem; dense?: boolean }) {
  const color = item.space?.color ?? '#8b5cf6'
  const st = item.piece ? PIECE_STATUS[item.piece.status] : null
  return (
    <button
      type="button" onClick={(e) => { e.stopPropagation(); openItem(item) }}
      className={clsx('group flex w-full items-center gap-1.5 rounded-lg border-l-[3px] px-1.5 text-left transition-colors',
        dense ? 'py-0.5 text-[11px]' : 'py-1 text-[12px]',
        item.done ? 'opacity-45 line-through' : '', item.overdue ? 'bg-danger/15' : 'bg-surface-3/70 hover:bg-surface-3')}
      style={{ borderLeftColor: color }}
      title={`${item.title}${item.space ? ' · ' + item.space.name : ''}`}
    >
      {item.kind === 'piece' ? <TypeIcon type={item.piece!.type} size={11} className="shrink-0 text-muted" /> : item.task?.is_meeting ? <Users size={11} className="shrink-0 text-muted" /> : <CheckSquare2 size={11} className="shrink-0 text-muted" />}
      {item.time && <span className="shrink-0 tabular-nums text-muted">{item.time}</span>}
      <span className="truncate">{item.title}</span>
      {st && !dense && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: st.color }} title={st.label} />}
    </button>
  )
}

export function MonthNav({ month, onChange, children }: { month: string; onChange: (m: string) => void; children?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <button className="btn btn-icon btn-sm" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Mes anterior"><ChevronLeft size={16} /></button>
      <div className="min-w-[130px] text-center text-sm font-semibold">{monthLabel(month)}</div>
      <button className="btn btn-icon btn-sm" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Mes siguiente"><ChevronRight size={16} /></button>
      <button className="btn btn-sm" onClick={() => onChange(todayKey().slice(0, 7))}>Hoy</button>
      {children}
    </div>
  )
}

export function MonthGrid({ month, items, onDayClick, maxPerDay = 4, daySheet = true }: { month: string; items: AgendaItem[]; onDayClick?: (k: string) => void; maxPerDay?: number; daySheet?: boolean }) {
  const [sheet, setSheet] = useState<string | null>(null)
  // en el celular los días muestran puntitos: tocar un día con cosas abre su lista
  const tapDay = (k: string, n: number) => {
    if (daySheet && n > 0 && window.matchMedia('(max-width: 639px)').matches) setSheet(k)
    else onDayClick?.(k)
  }
  const days = monthMatrix(month)
  const t = todayKey()
  const byDay = new Map<string, AgendaItem[]>()
  for (const i of items) byDay.set(i.date, [...(byDay.get(i.date) ?? []), i])
  const all = new Map(items.map((i) => [itemKey(i), i]))
  const prev = useRef(month)
  const dir = month === prev.current ? 0 : month > prev.current ? 1 : -1
  prev.current = month
  return (
    <DnD onDrop={(drag, drop) => moveItemTo(drag, drop.replace('day:', ''))} overlay={(id) => all.get(id) && <div className="w-40"><AgendaChip item={all.get(id)!} /></div>}>
      <div className="overflow-hidden rounded-xl">
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
      <motion.div key={month} custom={dir}
        initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {WEEKDAYS_SHORT.map((d) => <div key={d} className="bg-surface px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted">{d}</div>)}
        {days.map((k) => {
          const list = byDay.get(k) ?? []
          const out = k.slice(0, 7) !== month
          return (
            <Droppable key={k} id={`day:${k}`} className={clsx('group min-h-[74px] bg-surface p-1 sm:min-h-[108px] sm:p-1.5', out && 'bg-surface/40')}>
              <div className="flex h-full flex-col" onClick={() => tapDay(k, list.length)}>
                <div className="mb-1 flex items-center justify-between">
                  <span className={clsx('grid h-6 w-6 place-items-center rounded-full text-[12px] tabular-nums',
                    k === t ? 'font-bold text-white' : out ? 'text-faint' : 'text-muted')} style={k === t ? { background: 'var(--accent)' } : undefined}>
                    {Number(k.slice(8))}
                  </span>
                  {onDayClick && <span className="hidden text-[16px] leading-none text-faint group-hover:inline">+</span>}
                </div>
                {/* Celular: puntos; escritorio: chips */}
                <div className="flex flex-wrap gap-0.5 sm:hidden">
                  {list.slice(0, 6).map((i) => <span key={itemKey(i)} className="h-1.5 w-1.5 rounded-full" style={{ background: i.space?.color ?? 'var(--accent)', opacity: i.done ? .35 : 1 }} />)}
                </div>
                <div className="hidden flex-col gap-0.5 sm:flex">
                  {list.slice(0, maxPerDay).map((i) => <Draggable key={itemKey(i)} id={itemKey(i)}><AgendaChip item={i} dense /></Draggable>)}
                  {list.length > maxPerDay && <span className="px-1 text-[11px] text-muted">+{list.length - maxPerDay} más</span>}
                </div>
              </div>
            </Droppable>
          )
        })}
      </motion.div>
      </AnimatePresence>
      </div>
      {sheet && (
        <Modal onClose={() => setSheet(null)} title={fmt(sheet, "EEEE d 'de' MMMM")}>
          <div className="space-y-1.5">
            {(byDay.get(sheet) ?? []).map((i) => <div key={itemKey(i)} onClick={() => setSheet(null)}><WeekCard item={i} /></div>)}
          </div>
          {onDayClick && <button className="btn mt-3 w-full" onClick={() => { const k = sheet; setSheet(null); onDayClick(k) }}><Plus size={15} />Agregar en este día</button>}
        </Modal>
      )}
    </DnD>
  )
}

export function WeekGrid({ days, items, onAdd, hoursPerDay = 8, showLoad = true }: { days: string[]; items: AgendaItem[]; onAdd?: (k: string) => void; hoursPerDay?: number; showLoad?: boolean }) {
  const t = todayKey()
  const all = new Map(items.map((i) => [itemKey(i), i]))
  return (
    <DnD onDrop={(drag, drop) => moveItemTo(drag, drop.replace('day:', ''))} overlay={(id) => all.get(id) && <div className="w-52"><WeekCard item={all.get(id)!} /></div>}>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-7 lg:overflow-visible">
        {days.map((k) => {
          const list = items.filter((i) => i.date === k)
          const mins = list.filter((i) => i.kind === 'task' && !i.done).reduce((a, i) => a + i.minutes, 0)
          const load = mins / 60 / (hoursPerDay || 8)
          const over = load > 1
          return (
            <Droppable key={k} id={`day:${k}`} className="w-[78vw] shrink-0 snap-start rounded-2xl sm:w-[300px] lg:w-auto">
              <div className={clsx('flex h-full min-h-[200px] flex-col rounded-2xl border bg-surface p-2.5', k === t ? 'border-[var(--accent)]/60' : 'border-line', over && 'border-warn/60')}>
                <div className="mb-2 flex items-start justify-between px-1">
                  <div>
                    <div className={clsx('text-[11px] font-semibold uppercase tracking-wider', k === t ? 'text-accent-2' : 'text-muted')}>{fmt(k, 'EEEE')}</div>
                    <div className="text-lg font-semibold tabular-nums">{Number(k.slice(8))}</div>
                  </div>
                  {onAdd && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onAdd(k)} aria-label={`Agregar el ${fmt(k)}`}>+</button>}
                </div>
                {showLoad && (
                  <div className="mb-2 px-1">
                    <div className="mb-1 flex justify-between text-[10.5px] text-muted"><span>{(mins / 60).toFixed(mins % 60 ? 1 : 0)} h estimadas</span>{over && <span className="font-semibold text-warn">Sobrecarga</span>}</div>
                    <div className="h-1 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${Math.min(100, load * 100)}%`, background: over ? 'var(--warn)' : 'var(--accent)' }} /></div>
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-1.5">
                  {list.map((i) => <Draggable key={itemKey(i)} id={itemKey(i)}><WeekCard item={i} /></Draggable>)}
                  {!list.length && <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-line text-[11px] text-faint">Libre</div>}
                </div>
              </div>
            </Droppable>
          )
        })}
      </div>
    </DnD>
  )
}

export function WeekCard({ item }: { item: AgendaItem }) {
  const color = item.space?.color ?? '#8b5cf6'
  return (
    <div onClick={() => openItem(item)} role="button" tabIndex={0}
      className={clsx('cursor-pointer rounded-xl border border-line bg-surface-2 p-2 transition-colors hover:border-line-strong', item.overdue && 'border-danger/40 bg-danger/10', item.done && 'opacity-50')}>
      <div className="flex items-start gap-2">
        {item.kind === 'task'
          ? <CheckCircle checked={item.done} onChange={() => toggleTask(item.task!)} color={color} />
          : <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full" style={{ background: color + '26', color }}><TypeIcon type={item.piece!.type} size={12} /></span>}
        <div className="min-w-0 flex-1">
          <div className={clsx('text-[13px] font-medium leading-snug', item.done && 'line-through')}>{item.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
            {item.time && <span className="tabular-nums">{item.time}</span>}
            {item.space && <span className="inline-flex items-center gap-1"><Dot color={color} size={5} />{item.space.name}</span>}
            <span>{item.sub}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DayList({ date, items, onPrev, onNext }: { date: string; items: AgendaItem[]; onPrev: () => void; onNext: () => void }) {
  const list = items.filter((i) => i.date === date)
  const timed = list.filter((i) => i.time)
  const untimed = list.filter((i) => !i.time)
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button className="btn btn-icon btn-sm" onClick={onPrev} aria-label="Día anterior"><ChevronLeft size={16} /></button>
        <div className="min-w-[160px] text-center text-sm font-semibold">{fmt(date, "EEEE d 'de' MMMM")}</div>
        <button className="btn btn-icon btn-sm" onClick={onNext} aria-label="Día siguiente"><ChevronRight size={16} /></button>
      </div>
      {list.length === 0 && <p className="py-8 text-center text-sm text-muted">Nada agendado este día.</p>}
      <div className="space-y-1.5">
        {timed.map((i) => (
          <div key={itemKey(i)} className="flex gap-3">
            <div className="w-12 shrink-0 pt-2.5 text-right text-xs tabular-nums text-muted">{i.time}</div>
            <div className="flex-1"><WeekCard item={i} /></div>
          </div>
        ))}
        {untimed.length > 0 && <div className="pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Sin horario</div>}
        {untimed.map((i) => <div key={itemKey(i)} className="ml-[60px]"><WeekCard item={i} /></div>)}
      </div>
    </div>
  )
}

export const nextDay = (k: string, n: number) => addDaysKey(k, n)
