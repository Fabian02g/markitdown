import { useState } from 'react'
import { useParams, useSearchParams, Navigate } from 'react-router-dom'
import { Pencil, Plus, StickyNote } from 'lucide-react'
import { ClientPlan } from '../components/ClientPlan'
import { SpaceEditor } from '../components/SpaceEditor'
import { TaskExplorer } from '../components/TaskExplorer'
import { NoteCard } from './Notas'
import { Dot, Empty, PageHead, Segmented } from '../components/ui'
import { SPACE_KIND } from '../lib/constants'
import { todayKey } from '../lib/dates'
import { spaceStats } from '../lib/selectors'
import { openModal, useStore } from '../lib/store'

export default function SpacePage() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const space = useStore((s) => s.spaces.find((x) => x.id === id))
  const ready = useStore((s) => s.ready)
  const tasks = useStore((s) => s.tasks)
  const pieces = useStore((s) => s.pieces)
  const allNotes = useStore((s) => s.notes)
  const [tab, setTab] = useState<'contenido' | 'tareas' | 'notas'>(space?.kind === 'cliente' ? 'contenido' : 'tareas')
  const [month, setMonth] = useState(sp.get('m') || todayKey().slice(0, 7))
  const [edit, setEdit] = useState(false)
  if (!space) return ready ? <Navigate to="/" replace /> : null
  const notes = allNotes.filter((n) => n.space_id === space.id)
  const st = spaceStats(space.id, tasks, pieces)
  const isClient = space.kind === 'cliente'

  return (
    <>
      <PageHead kicker={SPACE_KIND[space.kind]} title={<><Dot color={space.color} size={11} />{space.name}
        <button className="btn btn-ghost btn-icon btn-sm text-muted" onClick={() => setEdit(true)} aria-label="Editar espacio"><Pencil size={15} /></button></>}>
        <div className="mr-2 hidden gap-4 text-xs text-muted sm:flex">
          <span><b className="text-ink">{st.pending}</b> pendientes</span><span><b className="text-ok">{st.done}</b> hechas</span>{st.overdue > 0 && <span><b className="text-danger">{st.overdue}</b> vencidas</span>}
        </div>
        {isClient && <button className="btn" onClick={() => openModal({ type: 'piece', preset: { space_id: space.id } })}><Plus size={15} />Pieza</button>}
        <button className="btn btn-primary" onClick={() => openModal({ type: 'task', preset: { space_id: space.id } })}><Plus size={16} />Tarea</button>
      </PageHead>

      <div className="mb-4">
        <Segmented value={tab} onChange={setTab} options={[
          ...(isClient ? [['contenido', 'Contenido / PDP'] as ['contenido', string]] : []),
          ['tareas', `Tareas · ${tasks.filter((t) => t.space_id === space.id && t.status !== 'done').length}`],
          ['notas', `Notas · ${notes.length}`],
        ]} />
      </div>

      {tab === 'contenido' && isClient && <ClientPlan space={space} month={month} setMonth={setMonth} />}
      {tab === 'tareas' && <TaskExplorer spaceId={space.id} />}
      {tab === 'notas' && (
        <>
          <button className="btn mb-4" onClick={() => openModal({ type: 'note', preset: { space_id: space.id } })}><Plus size={15} />Nota</button>
          {notes.length === 0 ? <Empty icon={<StickyNote size={20} />} title="Sin notas en este espacio" /> : (
            <div className="columns-1 gap-3 sm:columns-2 xl:columns-3">{notes.map((n) => <NoteCard key={n.id} note={n} />)}</div>
          )}
        </>
      )}
      {edit && <SpaceEditor space={space} onClose={() => setEdit(false)} />}
    </>
  )
}
