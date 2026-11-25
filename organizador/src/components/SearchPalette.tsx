import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ListTodo, StickyNote, FolderOpen } from 'lucide-react'
import { relDay } from '../lib/dates'
import { normalize, useSpaceMap } from '../lib/selectors'
import { closeModal, openModal, useStore } from '../lib/store'
import { PIECE_TYPE } from '../lib/constants'
import { Dot, Modal } from './ui'
import { TypeIcon } from './TypeIcon'

export function SearchPalette() {
  const [q, setQ] = useState('')
  const tasks = useStore((s) => s.tasks)
  const pieces = useStore((s) => s.pieces)
  const notes = useStore((s) => s.notes)
  const spaces = useStore((s) => s.spaces)
  const map = useSpaceMap()
  const nav = useNavigate()
  const results = useMemo(() => {
    const n = normalize(q.trim())
    if (!n) return null
    const has = (...xs: (string | null | undefined)[]) => xs.some((x) => x && normalize(x).includes(n))
    return {
      spaces: spaces.filter((s) => has(s.name)).slice(0, 5),
      tasks: tasks.filter((t) => has(t.title, t.description, t.notes, t.category, t.tags.join(' '))).slice(0, 8),
      pieces: pieces.filter((p) => has(p.title, p.copy, p.concept, p.notes, p.pillar)).slice(0, 8),
      notes: notes.filter((x) => has(x.title, x.body, x.category)).slice(0, 6),
    }
  }, [q, tasks, pieces, notes, spaces])
  const total = results ? results.spaces.length + results.tasks.length + results.pieces.length + results.notes.length : 0
  const Item = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-surface-2">{children}</button>
  )
  return (
    <Modal onClose={closeModal}>
      <div className="sticky top-0 -mx-5 border-b border-line bg-surface px-5 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-muted" />
          <input autoFocus className="h-10 flex-1 bg-transparent text-base outline-none placeholder:text-faint" placeholder="Buscar tareas, contenidos, notas, clientes…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="pt-3">
        {!results && <p className="px-3 py-6 text-center text-sm text-muted">Escribí para buscar en todo.</p>}
        {results && total === 0 && <p className="px-3 py-6 text-center text-sm text-muted">Sin resultados para “{q}”.</p>}
        {results && results.spaces.map((s) => (
          <Item key={s.id} onClick={() => { closeModal(); nav(s.kind === 'cliente' ? `/editorial/${s.id}` : `/espacio/${s.id}`) }}>
            <FolderOpen size={15} className="text-muted" /><Dot color={s.color} /><span className="flex-1">{s.name}</span>
          </Item>
        ))}
        {results && results.tasks.map((t) => (
          <Item key={t.id} onClick={() => openModal({ type: 'task', id: t.id })}>
            <ListTodo size={15} className="text-muted" /><span className="flex-1 truncate">{t.title}</span>
            <span className="text-xs text-muted">{t.space_id && map.get(t.space_id)?.name} · {relDay(t.due_date)}</span>
          </Item>
        ))}
        {results && results.pieces.map((p) => (
          <Item key={p.id} onClick={() => openModal({ type: 'piece', id: p.id })}>
            <TypeIcon type={p.type} size={15} className="text-muted" /><span className="flex-1 truncate">{p.title}</span>
            <span className="text-xs text-muted">{map.get(p.space_id)?.name} · {PIECE_TYPE[p.type].label} · {relDay(p.publish_date)}</span>
          </Item>
        ))}
        {results && results.notes.map((x) => (
          <Item key={x.id} onClick={() => openModal({ type: 'note', id: x.id })}>
            <StickyNote size={15} className="text-muted" /><span className="flex-1 truncate">{x.title || x.body.slice(0, 80)}</span>
            <span className="text-xs text-muted">{x.category}</span>
          </Item>
        ))}
      </div>
    </Modal>
  )
}
