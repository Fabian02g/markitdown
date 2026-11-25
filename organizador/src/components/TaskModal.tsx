import { useMemo, useRef, useState } from 'react'
import { ChevronDown, Paperclip, Plus, Star, Trash2, Users, X } from 'lucide-react'
import clsx from 'clsx'
import { useShallow } from 'zustand/react/shallow'
import { PRIORITY, TASK_STATUS, TASK_STATUS_ORDER } from '../lib/constants'
import { hm, todayKey, addDaysKey } from '../lib/dates'
import { useSpaces } from '../lib/selectors'
import { closeModal, deleteAttachment, deleteTask, openAttachment, saveTask, toast, uploadAttachment, useStore } from '../lib/store'
import type { Priority, Subtask, Task, TaskStatus } from '../lib/types'
import { ReminderRules } from './ReminderRules'
import { ConfirmButton, Dot, Field, Modal, TagInput } from './ui'

type Draft = Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'sort'>

const blank = (preset?: Partial<Task>): Draft => ({
  space_id: null, title: '', description: '', category: '', tags: [], priority: 'medium', status: 'todo',
  is_meeting: false, due_date: todayKey(), due_time: null, estimate_min: 0, subtasks: [], notes: '',
  reminder_rules: null, is_top: false, ...preset,
})

export function TaskModal({ id, preset }: { id?: string; preset?: Partial<Task> }) {
  const existing = useStore((s) => (id ? s.tasks.find((t) => t.id === id) : undefined))
  const profile = useStore((s) => s.profile)
  const attachments = useStore(useShallow((s) => s.attachments.filter((a) => id && a.task_id === id)))
  const spaces = useSpaces()
  const [d, setD] = useState<Draft>(() => (existing ? { ...existing } : blank({ space_id: spaces[0]?.id ?? null, ...preset })))
  const [more, setMore] = useState(Boolean(existing && (existing.description || existing.notes || existing.subtasks.length || existing.tags.length)))
  const [newSub, setNewSub] = useState('')
  const [pending, setPending] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const initial = useRef<string | null>(null)
  const saved = useRef(false)
  const up = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  const space = spaces.find((s) => s.id === d.space_id)
  const categories = useMemo(() => [...new Set([...(space?.categories ?? []), ...(profile?.categories ?? [])])], [space, profile])

  if (initial.current === null) initial.current = JSON.stringify(d)
  const requestClose = () => {
    if (!saved.current && (JSON.stringify(d) !== initial.current || pending.length) && !window.confirm('Tenés cambios sin guardar en esta tarea. ¿Descartarlos?')) return
    closeModal()
  }

  if (id && !existing) return null

  const savedRef = () => { saved.current = true }
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!d.title.trim()) return toast('Poné un nombre a la tarea')
    setSaving(true)
    const payload: Partial<Task> = {
      ...d, title: d.title.trim(),
      due_time: d.due_date && d.due_time ? hm(d.due_time) : null,
      estimate_min: Number(d.estimate_min) || 0,
    }
    const saved = await saveTask(existing ? { ...payload, id: existing.id } : payload)
    if (saved) for (const f of pending) await uploadAttachment(f, { task_id: saved.id })
    setSaving(false)
    if (saved) { savedRef(); closeModal(); toast(existing ? 'Tarea actualizada' : 'Tarea creada', { tone: 'ok' }) }
  }

  const addSub = () => {
    const t = newSub.trim()
    if (!t) return
    up('subtasks', [...d.subtasks, { id: crypto.randomUUID(), title: t, done: false }])
    setNewSub('')
  }
  const setSub = (s: Subtask, patch: Partial<Subtask>) => up('subtasks', d.subtasks.map((x) => (x.id === s.id ? { ...x, ...patch } : x)))

  return (
    <Modal
      onClose={requestClose}
      title={existing ? 'Editar tarea' : 'Nueva tarea'}
      footer={<>
        {existing && <ConfirmButton className="btn-ghost mr-auto text-danger" onConfirm={() => { saved.current = true; deleteTask(existing); closeModal() }}><Trash2 size={15} />Eliminar</ConfirmButton>}
        <button className="btn btn-ghost" onClick={requestClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => submit()} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </>}
    >
      <form onSubmit={submit} className="space-y-4">
        <input
          autoFocus={!existing} className="w-full bg-transparent text-lg font-semibold outline-none placeholder:text-faint"
          placeholder="¿Qué tenés que hacer?" value={d.title} onChange={(e) => up('title', e.target.value)}
        />

        <div className="flex flex-wrap gap-1.5">
          {spaces.map((s) => (
            <button type="button" key={s.id} onClick={() => up('space_id', s.id)} className={clsx('chip', d.space_id === s.id && 'chip-on')}>
              <Dot color={s.color} size={7} />{s.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Fecha" className="col-span-1 sm:col-span-1">
            <input type="date" className="input" value={d.due_date ?? ''} onChange={(e) => up('due_date', e.target.value || null)} />
          </Field>
          <Field label="Hora">
            <input type="time" className="input" value={hm(d.due_time)} disabled={!d.due_date} onChange={(e) => up('due_time', e.target.value || null)} />
          </Field>
          <Field label="Prioridad">
            <select className="input" value={d.priority} onChange={(e) => up('priority', e.target.value as Priority)}>
              {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Estado">
            <select className="input" value={d.status} onChange={(e) => up('status', e.target.value as TaskStatus)}>
              {TASK_STATUS_ORDER.map((k) => <option key={k} value={k}>{TASK_STATUS[k].label}</option>)}
            </select>
          </Field>
        </div>
        <div className="-mt-1 flex flex-wrap gap-1.5">
          {[['Hoy', todayKey()], ['Mañana', addDaysKey(todayKey(), 1)], ['En una semana', addDaysKey(todayKey(), 7)]].map(([l, k]) => (
            <button type="button" key={l} className={clsx('chip', d.due_date === k && 'chip-on')} onClick={() => up('due_date', k)}>{l}</button>
          ))}
          <button type="button" className={clsx('chip', !d.due_date && 'chip-on')} onClick={() => up('due_date', null)}>Sin fecha</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <input className="input" list="task-cats" value={d.category} placeholder="Ej.: Edición de video" onChange={(e) => up('category', e.target.value)} />
            <datalist id="task-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Tiempo estimado (min)">
            <input type="number" min={0} step={15} className="input" value={d.estimate_min || ''} placeholder="0" onChange={(e) => up('estimate_min', Number(e.target.value))} />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className={clsx('chip', d.is_top && 'chip-on')} onClick={() => up('is_top', !d.is_top)}><Star size={12} />Prioridad del día</button>
          <button type="button" className={clsx('chip', d.is_meeting && 'chip-on')} onClick={() => up('is_meeting', !d.is_meeting)}><Users size={12} />Es una reunión</button>
        </div>

        {d.due_date && d.status !== 'done' && (
          <ReminderRules value={d.reminder_rules} defaults={profile?.task_rules ?? []} onChange={(v) => up('reminder_rules', v)} />
        )}

        <button type="button" className="flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink" onClick={() => setMore(!more)}>
          <ChevronDown size={15} className={clsx('transition-transform', more && 'rotate-180')} /> Descripción, subtareas, notas y archivos
        </button>

        {more && (
          <div className="space-y-4 fade-in">
            <Field label="Descripción">
              <textarea rows={3} className="input" value={d.description} onChange={(e) => up('description', e.target.value)} />
            </Field>

            <div>
              <span className="label">Subtareas</span>
              <div className="space-y-1">
                {d.subtasks.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-surface-2">
                    <input type="checkbox" checked={s.done} onChange={(e) => setSub(s, { done: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
                    <input className={clsx('flex-1 bg-transparent text-sm outline-none', s.done && 'text-faint line-through')} value={s.title} onChange={(e) => setSub(s, { title: e.target.value })} />
                    <button type="button" className="text-faint hover:text-danger" onClick={() => up('subtasks', d.subtasks.filter((x) => x.id !== s.id))} aria-label="Quitar subtarea"><X size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex gap-2">
                <input className="input h-9" placeholder="Agregar subtarea…" value={newSub} onChange={(e) => setNewSub(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub() } }} />
                <button type="button" className="btn btn-icon" onClick={addSub} aria-label="Agregar subtarea"><Plus size={16} /></button>
              </div>
            </div>

            <Field label="Etiquetas"><TagInput value={d.tags} onChange={(v) => up('tags', v)} placeholder="Escribí y Enter" /></Field>
            <Field label="Notas"><textarea rows={3} className="input" value={d.notes} onChange={(e) => up('notes', e.target.value)} /></Field>

            <div>
              <span className="label">Archivos</span>
              <div className="space-y-1">
                {attachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                    <Paperclip size={14} className="text-muted" />
                    <button type="button" className="flex-1 truncate text-left hover:underline" onClick={() => openAttachment(a)}>{a.name}</button>
                    <span className="text-xs text-faint">{Math.ceil(a.size / 1024)} KB</span>
                    <button type="button" className="text-faint hover:text-danger" onClick={() => deleteAttachment(a)} aria-label="Eliminar archivo"><X size={14} /></button>
                  </div>
                ))}
                {pending.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted">
                    <Paperclip size={14} /> <span className="flex-1 truncate">{f.name}</span><span className="text-xs">se sube al guardar</span>
                    <button type="button" onClick={() => setPending(pending.filter((_, j) => j !== i))} aria-label="Quitar"><X size={14} /></button>
                  </div>
                ))}
              </div>
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => { setPending([...pending, ...Array.from(e.target.files ?? [])]); e.target.value = '' }} />
              <button type="button" className="btn btn-sm mt-2" onClick={() => fileRef.current?.click()}><Paperclip size={14} />Adjuntar archivo</button>
            </div>
          </div>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
