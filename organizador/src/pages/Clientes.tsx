import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, Plus, Users } from 'lucide-react'
import { SpaceEditor } from '../components/SpaceEditor'
import { TaskExplorer } from '../components/TaskExplorer'
import { Dot, Empty, PageHead, Progress } from '../components/ui'
import { todayKey } from '../lib/dates'
import { spaceStats, useSpaces } from '../lib/selectors'
import { useStore } from '../lib/store'
import type { SpaceKind } from '../lib/types'

function SpacesBoard({ kind }: { kind: SpaceKind }) {
  const spaces = useSpaces().filter((s) => s.kind === kind)
  const tasks = useStore((s) => s.tasks)
  const pieces = useStore((s) => s.pieces)
  const [creating, setCreating] = useState(false)
  const ym = todayKey().slice(0, 7)
  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {spaces.map((s) => {
          const st = spaceStats(s.id, tasks, pieces)
          const month = pieces.filter((p) => p.space_id === s.id && p.publish_date?.slice(0, 7) === ym)
          const pub = month.filter((p) => p.status === 'publicado').length
          return (
            <Link key={s.id} to={`/espacio/${s.id}`} className="card card-pad relative overflow-hidden transition-all hover:-translate-y-0.5 hover:border-line-strong">
              <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: s.color }} />
              <div className="mb-3 flex items-center gap-2"><Dot color={s.color} /><b className="truncate">{s.name}</b></div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-muted">
                <div><div className="text-lg font-semibold text-ink">{st.pending}</div>pendientes</div>
                <div><div className="text-lg font-semibold text-ok">{st.done}</div>hechas</div>
                <div><div className={st.overdue ? 'text-lg font-semibold text-danger' : 'text-lg font-semibold text-faint'}>{st.overdue}</div>vencidas</div>
              </div>
              {kind === 'cliente' && <div className="mt-3"><div className="mb-1 flex justify-between text-[11px] text-muted"><span>Este mes</span><span>{pub}/{month.length} publicadas</span></div><Progress value={month.length ? (pub / month.length) * 100 : 0} color={s.color} /></div>}
            </Link>
          )
        })}
        <button onClick={() => setCreating(true)} className="card card-pad grid min-h-[140px] place-items-center border-dashed text-muted transition-colors hover:border-[var(--accent)] hover:text-ink">
          <span className="flex items-center gap-2 text-sm font-medium"><Plus size={16} />{kind === 'cliente' ? 'Nuevo cliente' : 'Nuevo proyecto'}</span>
        </button>
      </div>
      {creating && <SpaceEditor kind={kind} onClose={() => setCreating(false)} />}
      {spaces.length === 0 && <Empty icon={kind === 'cliente' ? <Users size={20} /> : <FolderKanban size={20} />} title={kind === 'cliente' ? 'Sin clientes todavía' : 'Sin proyectos todavía'} />}
    </>
  )
}

export default function Clientes() {
  return (
    <>
      <PageHead kicker="Freelance" title="Clientes freelance" />
      <SpacesBoard kind="cliente" />
      <h2 className="h2 mb-3">Todas las tareas freelance</h2>
      <TaskExplorer lockKind="cliente" />
    </>
  )
}

export function Proyectos() {
  return (
    <>
      <PageHead kicker="Proyectos personales o profesionales" title="Proyectos" />
      <SpacesBoard kind="proyecto" />
      <h2 className="h2 mb-3">Tareas de proyectos</h2>
      <TaskExplorer lockKind="proyecto" />
    </>
  )
}
