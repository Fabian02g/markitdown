import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { Plus, Clapperboard } from 'lucide-react'
import { MonthGrid, MonthNav } from '../components/Calendar'
import { PieceRow } from '../components/Content'
import { DnD, Draggable, Droppable } from '../components/dnd'
import { Dot, Empty, PageHead, Progress, Segmented } from '../components/ui'
import { PIECE_STATUS, PIECE_STATUS_ORDER, PLAN_STAGES } from '../lib/constants'
import { todayKey } from '../lib/dates'
import { byPublish, toAgenda, useClients, useSpaceMap } from '../lib/selectors'
import { openModal, savePiece, useStore } from '../lib/store'
import type { PieceStatus } from '../lib/types'

type View = 'cal' | 'list' | 'board' | 'plans'

export default function Editorial() {
  const [sp, setSp] = useSearchParams()
  const ready = useStore((s) => s.ready)
  const pieces = useStore((s) => s.pieces)
  const plans = useStore((s) => s.plans)
  const clients = useClients()
  const map = useSpaceMap()
  const [month, setMonth] = useState(todayKey().slice(0, 7))
  const [view, setView] = useState<View>(() => (matchMedia('(max-width: 640px)').matches ? 'list' : 'cal'))
  const [client, setClient] = useState('all')

  useEffect(() => {
    const p = sp.get('p')
    if (p && ready) { openModal({ type: 'piece', id: p }); sp.delete('p'); setSp(sp, { replace: true }) }
  }, [sp, ready, setSp])

  const monthPieces = useMemo(() => pieces.filter((p) => (client === 'all' || p.space_id === client) && p.publish_date?.slice(0, 7) === month).sort(byPublish), [pieces, client, month])
  const undated = pieces.filter((p) => !p.publish_date && (client === 'all' || p.space_id === client))
  const agenda = useMemo(() => toAgenda([], monthPieces, map), [monthPieces, map])

  return (
    <>
      <PageHead kicker="Planificación de contenido" title="Calendario editorial">
        <button className="btn btn-primary" onClick={() => openModal({ type: 'piece', preset: client !== 'all' ? { space_id: client } : {} })}><Plus size={16} />Nueva pieza</button>
      </PageHead>

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button className={clsx('chip shrink-0', client === 'all' && 'chip-on')} onClick={() => setClient('all')}>Todas las marcas</button>
        {clients.map((c) => <button key={c.id} className={clsx('chip shrink-0', client === c.id && 'chip-on')} onClick={() => setClient(c.id)}><Dot color={c.color} size={7} />{c.name}</button>)}
      </div>

      <div className="card card-pad">
        <MonthNav month={month} onChange={setMonth}>
          <div className="ml-auto overflow-x-auto no-scrollbar">
            <Segmented value={view} onChange={setView} options={[['cal', 'Calendario'], ['list', 'Lista'], ['board', 'Por estado'], ['plans', 'Por cliente']]} />
          </div>
        </MonthNav>

        {view === 'cal' && <MonthGrid month={month} items={agenda} maxPerDay={5}
          onDayClick={(k) => openModal({ type: 'piece', preset: { publish_date: k, ...(client !== 'all' ? { space_id: client } : {}) } })} />}

        {view === 'list' && (monthPieces.length
          ? <div className="space-y-0.5">{monthPieces.map((p) => <PieceRow key={p.id} piece={p} space={map.get(p.space_id)} showSpace={client === 'all'} />)}</div>
          : <Empty icon={<Clapperboard size={20} />} title="No hay piezas este mes"><button className="btn btn-sm mt-2" onClick={() => openModal({ type: 'piece' })}><Plus size={14} />Crear pieza</button></Empty>)}

        {view === 'board' && (
          <DnD onDrop={(id, col) => savePiece({ id, status: col.replace('st:', '') as PieceStatus })}>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
              {PIECE_STATUS_ORDER.map((st) => {
                const list = monthPieces.filter((p) => p.status === st)
                return (
                  <Droppable key={st} id={`st:${st}`} className="w-[250px] shrink-0 rounded-2xl">
                    <div className="flex h-full min-h-[220px] flex-col rounded-2xl border border-line bg-surface-2/40 p-2">
                      <div className="mb-2 flex items-center gap-2 px-1.5 text-[12.5px] font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: PIECE_STATUS[st].color }} />{PIECE_STATUS[st].label}<span className="text-faint">{list.length}</span></div>
                      <div className="flex flex-col gap-1">{list.map((p) => <Draggable key={p.id} id={p.id}><div className="rounded-xl border border-line bg-surface"><PieceRow piece={p} space={map.get(p.space_id)} showSpace={client === 'all'} /></div></Draggable>)}</div>
                    </div>
                  </Droppable>
                )
              })}
            </div>
          </DnD>
        )}

        {view === 'plans' && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {clients.filter((c) => client === 'all' || c.id === client).map((c) => {
              const ps = pieces.filter((p) => p.space_id === c.id && p.publish_date?.slice(0, 7) === month)
              const plan = plans.find((p) => p.space_id === c.id && p.month === month)
              const stage = plan?.stage ?? 0
              const approved = ps.filter((p) => ['aprobado', 'programado', 'publicado'].includes(p.status)).length
              const published = ps.filter((p) => p.status === 'publicado').length
              return (
                <Link key={c.id} to={`/espacio/${c.id}?m=${month}`} className="card card-pad glow-hover relative overflow-hidden">
                  <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: c.color }} />
                  <div className="mb-3 flex items-center gap-2"><Dot color={c.color} /><b>{c.name}</b><span className="ml-auto text-xs text-muted">Etapa: {PLAN_STAGES[stage]}</span></div>
                  <div className="mb-3 flex gap-1">{PLAN_STAGES.map((s, i) => <span key={s} title={s} className="h-1.5 flex-1 rounded-full" style={{ background: i <= stage ? c.color : 'var(--surface-3)' }} />)}</div>
                  <div className="grid grid-cols-3 text-center text-xs text-muted">
                    <div><div className="text-lg font-semibold text-ink">{ps.length}</div>piezas</div>
                    <div><div className="text-lg font-semibold text-ink">{approved}</div>aprobadas</div>
                    <div><div className="text-lg font-semibold text-ink">{published}</div>publicadas</div>
                  </div>
                  <div className="mt-3"><Progress value={ps.length ? (published / ps.length) * 100 : 0} color={c.color} /></div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {undated.length > 0 && (
        <section className="card card-pad mt-5">
          <h2 className="h2 mb-2">Ideas sin fecha <span className="text-muted">{undated.length}</span></h2>
          <div className="space-y-0.5">{undated.map((p) => <PieceRow key={p.id} piece={p} space={map.get(p.space_id)} />)}</div>
        </section>
      )}
    </>
  )
}
