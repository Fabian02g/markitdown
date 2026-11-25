import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { DayList, MonthGrid, MonthNav } from '../components/Calendar'
import { PageHead, Segmented } from '../components/ui'
import { addDaysKey, todayKey } from '../lib/dates'
import { useAgenda } from '../lib/selectors'
import { openModal } from '../lib/store'

type F = 'all' | 'fijo' | 'cliente' | 'personal' | 'contenido'

export default function Agenda() {
  const [sp] = useSearchParams()
  const [day, setDay] = useState(sp.get('d') || todayKey())
  const [month, setMonth] = useState(day.slice(0, 7))
  const [f, setF] = useState<F>('all')
  const all = useAgenda()
  const items = useMemo(() => all.filter((i) => {
    if (f === 'all') return true
    if (f === 'contenido') return i.kind === 'piece'
    return i.kind === 'task' && i.space?.kind === f
  }), [all, f])
  return (
    <>
      <PageHead kicker="Todo junto: trabajo, clientes y personal" title="Mi agenda">
        <button className="btn btn-primary" onClick={() => openModal({ type: 'task', preset: { due_date: day } })}><Plus size={16} />Agendar</button>
      </PageHead>
      <div className="mb-4 overflow-x-auto no-scrollbar">
        <Segmented value={f} onChange={setF} options={[['all', 'Todo'], ['fijo', 'Trabajo fijo'], ['cliente', 'Freelance'], ['personal', 'Personal'], ['contenido', 'Publicaciones']]} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="card card-pad">
          <MonthNav month={month} onChange={setMonth} />
          <MonthGrid month={month} items={items} onDayClick={(k) => setDay(k)} />
          <p className="mt-3 text-xs text-faint">Tocá un día para ver el detalle. Arrastrá para mover de día.</p>
        </section>
        <section className="card card-pad">
          <DayList date={day} items={items} onPrev={() => setDay(addDaysKey(day, -1))} onNext={() => setDay(addDaysKey(day, 1))} />
          <div className="mt-4 flex gap-2">
            <button className="btn btn-sm flex-1" onClick={() => openModal({ type: 'task', preset: { due_date: day } })}><Plus size={14} />Tarea</button>
            <button className="btn btn-sm flex-1" onClick={() => openModal({ type: 'task', preset: { due_date: day, is_meeting: true, category: 'Reunión' } })}><Plus size={14} />Reunión</button>
            <button className="btn btn-sm flex-1" onClick={() => openModal({ type: 'piece', preset: { publish_date: day } })}><Plus size={14} />Publicación</button>
          </div>
        </section>
      </div>
    </>
  )
}
