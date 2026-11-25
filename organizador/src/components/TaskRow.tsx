import { useState } from 'react'
import clsx from 'clsx'
import { CalendarClock, ListChecks, Paperclip, Star, Users } from 'lucide-react'
import { PRIORITY, TASK_STATUS } from '../lib/constants'
import { hm, relDay } from '../lib/dates'
import { isTaskOverdue, useSpaceMap } from '../lib/selectors'
import { openModal, saveTask, toast, toggleTask, useStore } from '../lib/store'
import { SwipeRow } from './motion'
import { addDaysKey, todayKey } from '../lib/dates'
import type { Task } from '../lib/types'
import { Badge, CheckCircle, Dot } from './ui'

export function TaskRow({ task, showSpace = true, compact, swipe }: { task: Task; showSpace?: boolean; compact?: boolean; swipe?: boolean }) {
  const spaces = useSpaceMap()
  const nAtt = useStore((s) => s.attachments.filter((a) => a.task_id === task.id).length)
  const sp = task.space_id ? spaces.get(task.space_id) : undefined
  const [justDone, setJustDone] = useState(false)
  const done = task.status === 'done' || justDone
  // completar con un instante de pausa para que se vea el ✓ antes de que salga de la lista
  const complete = () => {
    if (task.status === 'done') return toggleTask(task)
    setJustDone(true)
    setTimeout(() => { toggleTask(task); setJustDone(false) }, 420)
  }
  const overdue = isTaskOverdue(task)
  const subDone = task.subtasks.filter((s) => s.done).length
  const row = (
    <div
      role="button" tabIndex={0}
      onClick={() => openModal({ type: 'task', id: task.id })}
      onKeyDown={(e) => e.key === 'Enter' && openModal({ type: 'task', id: task.id })}
      className={clsx('group flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 transition-colors hover:border-line hover:bg-surface-2',
        compact ? 'py-2' : 'py-2.5', overdue && 'bg-danger/[.06]')}
    >
      <CheckCircle checked={done} onChange={complete} color={sp?.color} />
      <div className="min-w-0 flex-1">
        <div className={clsx('flex items-center gap-1.5 truncate text-[14px] font-medium', done && 'text-faint line-through')}>
          {task.is_top && <Star size={13} className="shrink-0 fill-[var(--accent-2)] text-accent-2" />}
          {task.is_meeting && <Users size={13} className="shrink-0 text-muted" />}
          <span className="truncate">{task.title}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-muted">
          {task.due_date && (
            <span className={clsx('inline-flex items-center gap-1', overdue && 'font-medium text-danger')}>
              <CalendarClock size={12} />{relDay(task.due_date)}{task.due_time ? ' · ' + hm(task.due_time) : ''}{overdue ? ' · vencida' : ''}
            </span>
          )}
          {showSpace && sp && <span className="inline-flex items-center gap-1.5"><Dot color={sp.color} size={6} />{sp.name}</span>}
          {task.category && !compact && <span>{task.category}</span>}
          {task.subtasks.length > 0 && <span className="inline-flex items-center gap-1"><ListChecks size={12} />{subDone}/{task.subtasks.length}</span>}
          {nAtt > 0 && <span className="inline-flex items-center gap-1"><Paperclip size={12} />{nAtt}</span>}
          {!compact && task.tags.slice(0, 3).map((t) => <span key={t} className="text-faint">#{t}</span>)}
        </div>
      </div>
      {!compact && task.status !== 'todo' && task.status !== 'done' && <Badge color={TASK_STATUS[task.status].color} className="hidden sm:inline-flex">{TASK_STATUS[task.status].label}</Badge>}
      <span title={`Prioridad ${PRIORITY[task.priority].label}`} className="h-6 w-1 shrink-0 rounded-full" style={{ background: PRIORITY[task.priority].color, opacity: done ? .3 : 1 }} />
    </div>
  )
  if (!swipe) return row
  const tomorrow = addDaysKey(task.due_date && task.due_date > todayKey() ? task.due_date : todayKey(), 1)
  return (
    <SwipeRow disabled={done} onRight={complete}
      onLeft={() => { saveTask({ id: task.id, due_date: tomorrow }); toast('Pasada para ' + (tomorrow === addDaysKey(todayKey(), 1) ? 'mañana' : tomorrow.split('-').reverse().slice(0, 2).join('/'))) }}>
      {row}
    </SwipeRow>
  )
}
