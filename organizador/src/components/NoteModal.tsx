import { useState } from 'react'
import clsx from 'clsx'
import { ListTodo, Pin, Plus, Trash2, X, Clapperboard } from 'lucide-react'
import { NOTE_CATEGORIES } from '../lib/constants'
import { useSpaces } from '../lib/selectors'
import { closeModal, deleteNote, openModal, saveNote, toast, useStore } from '../lib/store'
import type { ChecklistItem, Note } from '../lib/types'
import { ConfirmButton, Dot, Field, Modal } from './ui'

export function NoteModal({ id, preset }: { id?: string; preset?: Partial<Note> }) {
  const existing = useStore((s) => (id ? s.notes.find((n) => n.id === id) : undefined))
  const spaces = useSpaces()
  const [d, setD] = useState<Partial<Note>>(() => existing ? { ...existing } : { title: '', body: '', category: 'Idea', checklist: [], pinned: false, space_id: null, ...preset })
  const [item, setItem] = useState('')
  const up = <K extends keyof Note>(k: K, v: Note[K]) => setD((x) => ({ ...x, [k]: v }))
  if (id && !existing) return null
  const list = d.checklist ?? []

  const save = async () => {
    if (!d.title?.trim() && !d.body?.trim() && !list.length) { closeModal(); return null }
    const r = await saveNote(existing ? { ...d, id: existing.id } : d)
    return r
  }
  const toTask = async () => {
    const r = await save()
    openModal({ type: 'task', preset: { title: d.title || (d.body ?? '').split('\n')[0].slice(0, 120), description: d.body ?? '', ...(d.space_id ? { space_id: d.space_id } : {}),
      subtasks: list.map((c) => ({ id: c.id, title: c.text, done: c.done })) } })
    if (r) toast('Completá la tarea y guardala. La nota se mantiene.')
  }
  const toPiece = async () => {
    await save()
    const sp = spaces.find((s) => s.id === d.space_id && s.kind === 'cliente')
    openModal({ type: 'piece', preset: { title: d.title || (d.body ?? '').split('\n')[0].slice(0, 120), concept: d.body ?? '', ...(sp ? { space_id: sp.id } : {}) } })
  }
  const addItem = () => {
    if (!item.trim()) return
    up('checklist', [...list, { id: crypto.randomUUID(), text: item.trim(), done: false }])
    setItem('')
  }
  const setIt = (c: ChecklistItem, p: Partial<ChecklistItem>) => up('checklist', list.map((x) => (x.id === c.id ? { ...x, ...p } : x)))

  return (
    <Modal
      onClose={closeModal} title={existing ? 'Nota' : 'Nueva nota'}
      footer={<>
        {existing && <ConfirmButton className="btn-ghost mr-auto text-danger" onConfirm={() => { deleteNote(existing); closeModal() }}><Trash2 size={15} /></ConfirmButton>}
        <button className="btn btn-ghost btn-sm" onClick={toPiece}><Clapperboard size={14} />A contenido</button>
        <button className="btn btn-ghost btn-sm" onClick={toTask}><ListTodo size={14} />A tarea</button>
        <button className="btn btn-primary" onClick={async () => { if (await save()) { closeModal(); toast('Nota guardada', { tone: 'ok' }) } }}>Guardar</button>
      </>}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <input autoFocus={!existing} className="flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-faint" placeholder="Título"
            value={d.title ?? ''} onChange={(e) => up('title', e.target.value)} />
          <button type="button" className={clsx('btn btn-icon btn-ghost', d.pinned && 'text-accent-2')} onClick={() => up('pinned', !d.pinned)} aria-label="Fijar nota"><Pin size={16} className={d.pinned ? 'fill-current' : ''} /></button>
        </div>
        <textarea rows={6} className="input" placeholder="Escribí tu idea, referencia o lo que se te ocurra…" value={d.body ?? ''} onChange={(e) => up('body', e.target.value)} />

        <div>
          <span className="label">Lista</span>
          {list.map((c) => (
            <div key={c.id} className="flex items-center gap-2 py-1">
              <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={c.done} onChange={(e) => setIt(c, { done: e.target.checked })} />
              <input className={clsx('flex-1 bg-transparent text-sm outline-none', c.done && 'text-faint line-through')} value={c.text} onChange={(e) => setIt(c, { text: e.target.value })} />
              <button type="button" className="text-faint hover:text-danger" onClick={() => up('checklist', list.filter((x) => x.id !== c.id))} aria-label="Quitar"><X size={14} /></button>
            </div>
          ))}
          <div className="mt-1 flex gap-2">
            <input className="input h-9" placeholder="Agregar ítem…" value={item} onChange={(e) => setItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }} />
            <button type="button" className="btn btn-icon" onClick={addItem} aria-label="Agregar"><Plus size={16} /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <input className="input" list="note-cats" value={d.category ?? ''} onChange={(e) => up('category', e.target.value)} />
            <datalist id="note-cats">{NOTE_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Vinculada a">
            <select className="input" value={d.space_id ?? ''} onChange={(e) => up('space_id', e.target.value || null)}>
              <option value="">Ninguno</option>
              {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </div>
        {d.space_id && <p className="-mt-2 flex items-center gap-1.5 text-xs text-muted"><Dot color={spaces.find((s) => s.id === d.space_id)?.color ?? '#888'} size={6} />Aparece en el panel de ese espacio</p>}
      </div>
    </Modal>
  )
}
