import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Pin, Plus, Search, StickyNote, Zap } from 'lucide-react'
import { Dot, Empty, PageHead } from '../components/ui'
import { normalize, useSpaceMap, useSpaces } from '../lib/selectors'
import { openModal, saveNote, toast, useStore } from '../lib/store'
import type { Note } from '../lib/types'

export function NoteCard({ note }: { note: Note }) {
  const map = useSpaceMap()
  const sp = note.space_id ? map.get(note.space_id) : undefined
  const done = note.checklist.filter((c) => c.done).length
  return (
    <button onClick={() => openModal({ type: 'note', id: note.id })}
      className="card mb-3 block w-full break-inside-avoid p-4 text-left transition-all hover:-translate-y-0.5 hover:border-line-strong">
      <div className="mb-1.5 flex items-center gap-2 text-[11px] text-muted">
        {note.pinned && <Pin size={12} className="fill-current text-accent-2" />}
        <span className="font-semibold uppercase tracking-wider">{note.category || 'Nota'}</span>
        {sp && <span className="ml-auto inline-flex items-center gap-1"><Dot color={sp.color} size={6} />{sp.name}</span>}
      </div>
      {note.title && <div className="mb-1 font-semibold">{note.title}</div>}
      {note.body && <p className="line-clamp-6 whitespace-pre-wrap text-[13px] text-muted">{note.body}</p>}
      {note.checklist.length > 0 && (
        <div className="mt-2 space-y-0.5 text-[13px]">
          {note.checklist.slice(0, 5).map((c) => <div key={c.id} className={clsx('flex items-center gap-2', c.done && 'text-faint line-through')}><span className={clsx('h-3 w-3 rounded border', c.done ? 'border-transparent bg-[var(--accent)]' : 'border-line-strong')} />{c.text}</div>)}
          {note.checklist.length > 5 && <div className="text-xs text-faint">+{note.checklist.length - 5} más</div>}
          <div className="pt-1 text-[11px] text-faint">{done}/{note.checklist.length} listos</div>
        </div>
      )}
      <div className="mt-2 text-[11px] text-faint">{new Date(note.updated_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</div>
    </button>
  )
}

export default function Notas() {
  const notes = useStore((s) => s.notes)
  const spaces = useSpaces()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [sp, setSp] = useState('all')
  const [quick, setQuick] = useState('')
  const cats = useMemo(() => [...new Set(notes.map((n) => n.category).filter(Boolean))], [notes])
  const list = useMemo(() => {
    const n = normalize(q)
    return notes.filter((x) => (cat === 'all' || x.category === cat) && (sp === 'all' || (sp === 'none' ? !x.space_id : x.space_id === sp))
      && (!n || normalize(x.title + ' ' + x.body + ' ' + x.checklist.map((c) => c.text).join(' ')).includes(n)))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at))
  }, [notes, q, cat, sp])
  const addQuick = async () => {
    if (!quick.trim()) return
    if (await saveNote({ body: quick.trim(), category: 'Idea', space_id: sp !== 'all' && sp !== 'none' ? sp : null })) { setQuick(''); toast('Idea guardada', { tone: 'ok' }) }
  }
  return (
    <>
      <PageHead kicker="Lo que se te ocurre en el día" title="Notas e ideas">
        <button className="btn btn-primary" onClick={() => openModal({ type: 'note' })}><Plus size={16} />Nota</button>
      </PageHead>
      <div className="card mb-4 flex items-center gap-2 p-2 pl-4">
        <Zap size={16} className="shrink-0 text-accent-2" />
        <input className="h-10 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint" placeholder="Anotá una idea rápida y Enter…" value={quick}
          onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addQuick()} />
        <button className="btn btn-sm" onClick={addQuick} disabled={!quick.trim()}>Guardar</button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input className="input h-9 pl-9 text-[13px]" placeholder="Buscar notas…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input h-9 w-auto text-[13px]" value={sp} onChange={(e) => setSp(e.target.value)} aria-label="Espacio">
          <option value="all">Todos los espacios</option><option value="none">Sin vincular</option>
          {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <button className={clsx('chip shrink-0', cat === 'all' && 'chip-on')} onClick={() => setCat('all')}>Todas</button>
          {cats.map((c) => <button key={c} className={clsx('chip shrink-0', cat === c && 'chip-on')} onClick={() => setCat(c)}>{c}</button>)}
        </div>
      </div>
      {list.length === 0 ? <Empty icon={<StickyNote size={20} />} title={notes.length ? 'Sin resultados' : 'Todavía no hay notas'}>Usá el botón + desde cualquier pantalla para capturar una idea.</Empty>
        : <div className="columns-1 gap-3 sm:columns-2 xl:columns-3">{list.map((n) => <NoteCard key={n.id} note={n} />)}</div>}
    </>
  )
}
