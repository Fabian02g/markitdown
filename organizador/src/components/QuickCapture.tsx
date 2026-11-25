import { useState } from 'react'
import clsx from 'clsx'
import { Clapperboard, ListTodo, StickyNote, ArrowRight, SlidersHorizontal } from 'lucide-react'
import { addDaysKey, todayKey } from '../lib/dates'
import { useSpaces } from '../lib/selectors'
import { closeModal, openModal, saveNote, savePiece, saveTask, toast } from '../lib/store'
import { Dot, Modal } from './ui'

type Kind = 'task' | 'note' | 'piece'

/** Captura rápida: escribir y Enter. Crea una tarea, nota o pieza en segundos. */
export function QuickCapture() {
  const spaces = useSpaces()
  const [kind, setKind] = useState<Kind>('task')
  const [text, setText] = useState('')
  const [space, setSpace] = useState<string | null>(spaces[0]?.id ?? null)
  const [date, setDate] = useState<string | null>(todayKey())
  const [time, setTime] = useState('')
  const clients = spaces.filter((s) => s.kind === 'cliente')
  const available = kind === 'piece' ? clients : spaces
  const spaceOk = kind === 'piece' ? clients.some((c) => c.id === space) : true

  const create = async () => {
    const t = text.trim()
    if (!t) return
    if (kind === 'task') {
      const r = await saveTask({ title: t, space_id: space, due_date: date, due_time: date && time ? time : null })
      if (r) toast('Tarea creada', { tone: 'ok' })
    } else if (kind === 'note') {
      const r = await saveNote({ title: '', body: t, space_id: space, category: 'Idea' })
      if (r) toast('Nota guardada', { tone: 'ok' })
    } else {
      if (!spaceOk) return toast('Elegí un cliente')
      const r = await savePiece({ title: t, space_id: space!, publish_date: date, publish_time: date && time ? time : null })
      if (r) toast('Pieza agregada al calendario', { tone: 'ok' })
    }
    closeModal()
  }
  const detail = () => {
    const t = text.trim()
    if (kind === 'task') openModal({ type: 'task', preset: { title: t, space_id: space, due_date: date, due_time: time || null } })
    else if (kind === 'note') openModal({ type: 'note', preset: { body: t, space_id: space } })
    else openModal({ type: 'piece', preset: { title: t, ...(spaceOk ? { space_id: space! } : {}), publish_date: date, publish_time: time || null } })
  }

  return (
    <Modal onClose={closeModal} title="Captura rápida">
      <div className="space-y-4">
        <div className="seg w-full">
          {([['task', 'Tarea', ListTodo], ['note', 'Nota / idea', StickyNote], ['piece', 'Contenido', Clapperboard]] as const).map(([k, l, I]) => (
            <button key={k} type="button" className={clsx('flex flex-1 items-center justify-center gap-1.5', kind === k && 'on')}
              onClick={() => { setKind(k); if (k === 'piece' && !clients.some((c) => c.id === space)) setSpace(clients[0]?.id ?? null) }}>
              <I size={14} />{l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input autoFocus className="input h-12 text-base" value={text} onChange={(e) => setText(e.target.value)}
            placeholder={kind === 'task' ? 'Ej.: Editar reel de la odontóloga' : kind === 'note' ? 'Anotá la idea…' : 'Ej.: Carrusel mitos de la ansiedad'}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); create() } }} />
          <button className="btn btn-primary h-12 w-12 shrink-0 px-0" onClick={create} disabled={!text.trim()} aria-label="Crear"><ArrowRight size={18} /></button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {kind === 'note' && <button type="button" className={clsx('chip', !space && 'chip-on')} onClick={() => setSpace(null)}>General</button>}
          {available.map((s) => (
            <button type="button" key={s.id} className={clsx('chip', space === s.id && 'chip-on')} onClick={() => setSpace(s.id)}><Dot color={s.color} size={7} />{s.name}</button>
          ))}
        </div>
        {kind !== 'note' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {[['Hoy', todayKey()], ['Mañana', addDaysKey(todayKey(), 1)]].map(([l, k]) => (
              <button type="button" key={l} className={clsx('chip', date === k && 'chip-on')} onClick={() => setDate(k)}>{l}</button>
            ))}
            <input type="date" className="input h-7 w-auto rounded-full px-2.5 text-xs" value={date ?? ''} onChange={(e) => setDate(e.target.value || null)} aria-label="Fecha" />
            <input type="time" className="input h-7 w-auto rounded-full px-2.5 text-xs" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Hora" />
            <button type="button" className={clsx('chip', !date && 'chip-on')} onClick={() => setDate(null)}>Sin fecha</button>
          </div>
        )}
        <button type="button" className="flex items-center gap-1.5 text-[13px] text-muted hover:text-ink" onClick={detail}><SlidersHorizontal size={14} />Abrir con todos los campos</button>
      </div>
    </Modal>
  )
}
