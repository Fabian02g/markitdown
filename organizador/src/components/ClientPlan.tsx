import { useMemo, useState } from 'react'
import { Copy, ExternalLink, MessageSquare, Plus, RefreshCw, Share2 } from 'lucide-react'
import { MonthGrid, MonthNav } from './Calendar'
import { IGGrid, PieceRow, StoriesRow } from './Content'
import { ConfirmButton, Empty, Progress, Segmented } from './ui'
import { PIECE_TYPE, PLAN_STAGES } from '../lib/constants'
import { monthLabel } from '../lib/dates'
import { byPublish, toAgenda, useSpaceMap } from '../lib/selectors'
import { openModal, rotatePortal, savePiece, savePlan, saveSpace, toast, useStore } from '../lib/store'
import type { Space } from '../lib/types'

export function portalUrl(s: Space) { return `${location.origin}/c/${s.portal_token}` }

export function ClientPlan({ space, month, setMonth }: { space: Space; month: string; setMonth: (m: string) => void }) {
  const pieces = useStore((s) => s.pieces)
  const plan = useStore((s) => s.plans.find((p) => p.space_id === space.id && p.month === month))
  const comments = useStore((s) => s.comments)
  const map = useSpaceMap()
  const [view, setView] = useState<'cal' | 'list' | 'grid'>(() => (matchMedia('(max-width: 640px)').matches ? 'list' : 'cal'))
  const [editAg, setEditAg] = useState(false)

  const monthPs = useMemo(() => pieces.filter((p) => p.space_id === space.id && p.publish_date?.slice(0, 7) === month).sort(byPublish), [pieces, space.id, month])
  const undated = pieces.filter((p) => p.space_id === space.id && !p.publish_date)
  const agenda = useMemo(() => toAgenda([], monthPs, map), [monthPs, map])
  const counted = monthPs.filter((p) => !p.is_extra)
  const videos = counted.filter((p) => PIECE_TYPE[p.type].video).length
  const statics = counted.filter((p) => !PIECE_TYPE[p.type].video && !PIECE_TYPE[p.type].story).length
  const stories = monthPs.filter((p) => p.type === 'historia').length
  const extras = monthPs.filter((p) => p.is_extra).length
  const ids = new Set(monthPs.map((p) => p.id))
  const pendingComments = comments.filter((c) => ids.has(c.piece_id) && c.author === 'cliente' && !c.resolved && c.kind !== 'aprobado')
  const approved = monthPs.filter((p) => p.approval === 'aprobado').length

  const copyLink = async () => {
    const url = portalUrl(space)
    try { await navigator.clipboard.writeText(url); toast('Enlace copiado. Mandáselo a ' + space.name, { tone: 'ok' }) }
    catch { prompt('Copiá este enlace:', url) }
  }
  const share = async () => {
    const url = portalUrl(space)
    if (navigator.share) { try { await navigator.share({ title: `Contenido ${monthLabel(month)}`, text: `Hola! Te comparto las ideas de contenido de ${monthLabel(month)} para que las revises y apruebes:`, url }) } catch { /* cancelado */ } }
    else copyLink()
  }
  const sendAll = () => {
    monthPs.filter((p) => p.approval === 'sin_enviar' && p.share_with_client).forEach((p) => savePiece({ id: p.id, approval: 'pendiente', status: ['idea', 'pendiente', 'redaccion', 'diseno', 'edicion', 'revision'].includes(p.status) ? 'esperando' : p.status }))
    toast('Piezas marcadas como enviadas al cliente')
  }

  const bar = (label: string, n: number, goal: number) => (
    <div>
      <div className="mb-1 flex justify-between text-[12.5px]"><span className="text-muted">{label}</span><b className={goal && n >= goal ? 'text-ok' : ''}>{n}{goal ? ` / ${goal}` : ''}</b></div>
      {goal > 0 && <Progress value={(n / goal) * 100} color={space.color} />}
    </div>
  )

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <section className="card card-pad min-w-0">
        <MonthNav month={month} onChange={setMonth}>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Segmented value={view} onChange={setView} options={[['cal', 'Calendario'], ['list', 'Lista'], ['grid', 'Grilla']]} />
            <button className="btn btn-primary btn-sm" onClick={() => openModal({ type: 'piece', preset: { space_id: space.id } })}><Plus size={14} />Pieza</button>
          </div>
        </MonthNav>
        {view === 'cal' && <MonthGrid month={month} items={agenda} maxPerDay={5} onDayClick={(k) => openModal({ type: 'piece', preset: { space_id: space.id, publish_date: k } })} />}
        {view === 'list' && (monthPs.length ? <div className="space-y-0.5">{monthPs.map((p) => <PieceRow key={p.id} piece={p} showSpace={false} />)}</div>
          : <Empty title={`Sin piezas en ${monthLabel(month)}`}><button className="btn btn-sm mt-2" onClick={() => openModal({ type: 'piece', preset: { space_id: space.id } })}><Plus size={14} />Agregar la primera</button></Empty>)}
        {view === 'grid' && <>
          <p className="mb-3 text-center text-xs text-muted">Así se vería el feed: lo más nuevo arriba a la izquierda. La línea de abajo indica el estado.</p>
          <StoriesRow pieces={monthPs} onOpen={(id) => openModal({ type: 'piece', id })} />
          <IGGrid pieces={monthPs} onOpen={(id) => openModal({ type: 'piece', id })} />
        </>}
        {undated.length > 0 && (
          <div className="mt-5 border-t border-line pt-4">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Ideas sin día ({undated.length})</div>
            {undated.map((p) => <PieceRow key={p.id} piece={p} showSpace={false} />)}
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <section className="card card-pad">
          <h2 className="h2 mb-1 flex items-center gap-2"><Share2 size={15} className="text-accent-2" />Vista para el cliente</h2>
          <p className="mb-3 text-xs text-muted">Un link con la grilla del mes. {space.name} puede aprobar cada pieza o dejarte comentarios, sin crear cuenta.</p>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button className="btn btn-sm" onClick={copyLink}><Copy size={13} />Copiar link</button>
            <button className="btn btn-sm" onClick={share}><Share2 size={13} />Compartir</button>
            <a className="btn btn-sm" href={portalUrl(space)} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} />Ver como cliente</a>
            <button className="btn btn-sm" onClick={sendAll} title="Marca todas las piezas como enviadas al cliente">Marcar enviado</button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{approved}/{monthPs.length} aprobadas</span>
            <ConfirmButton className="btn-ghost btn-sm text-xs" confirmText="¿Invalidar link actual?" onConfirm={() => rotatePortal(space.id)}><RefreshCw size={12} />Nuevo link</ConfirmButton>
          </div>
          {pendingComments.length > 0 && (
            <div className="mt-3 space-y-1.5 border-t border-line pt-3">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-warn"><MessageSquare size={13} />{pendingComments.length} comentario(s) por resolver</div>
              {pendingComments.slice(0, 4).map((c) => (
                <button key={c.id} onClick={() => openModal({ type: 'piece', id: c.piece_id })} className="block w-full rounded-lg bg-surface-2 px-2.5 py-1.5 text-left text-xs hover:bg-surface-3">
                  <b>{pieces.find((p) => p.id === c.piece_id)?.title}</b>: <span className="text-muted">{c.body || 'Pidió cambios'}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="card card-pad">
          <div className="mb-2 flex items-center justify-between"><h2 className="h2">Etapa del plan</h2><span className="text-xs text-muted">{monthLabel(month)}</span></div>
          <div className="grid grid-cols-3 gap-1.5">
            {PLAN_STAGES.map((s, i) => (
              <button key={s} onClick={() => savePlan(space.id, month, { stage: i })}
                className="rounded-lg border px-2 py-1.5 text-[11.5px] font-medium transition-colors"
                style={i === (plan?.stage ?? 0) ? { borderColor: space.color, background: space.color + '22', color: 'var(--text)' } : { borderColor: 'var(--border)', color: i < (plan?.stage ?? 0) ? 'var(--text)' : 'var(--muted)' }}>
                {i < (plan?.stage ?? 0) ? '✓ ' : ''}{s}
              </button>
            ))}
          </div>
          <label className="label mt-4">Brief del mes</label>
          <textarea key={month} rows={4} className="input" defaultValue={plan?.brief ?? ''} placeholder={`Qué comunica ${space.name} este mes, fechas especiales, pedidos…`}
            onBlur={(e) => e.target.value !== (plan?.brief ?? '') && savePlan(space.id, month, { brief: e.target.value })} />
        </section>

        <section className="card card-pad">
          <div className="mb-3 flex items-center justify-between"><h2 className="h2">Lo que acordamos</h2><button className="text-xs text-accent-2 hover:underline" onClick={() => setEditAg(!editAg)}>{editAg ? 'Listo' : 'Editar'}</button></div>
          {editAg ? (
            <div className="space-y-2.5">
              <label className="flex items-center justify-between gap-2 text-xs text-muted">Videos / reels por mes<input type="number" min={0} className="input h-8 w-20" defaultValue={space.quota_videos} onBlur={(e) => saveSpace({ id: space.id, quota_videos: Math.max(0, Number(e.target.value) || 0) })} /></label>
              <label className="flex items-center justify-between gap-2 text-xs text-muted">Posts / carruseles / gráficas<input type="number" min={0} className="input h-8 w-20" defaultValue={space.quota_static} onBlur={(e) => saveSpace({ id: space.id, quota_static: Math.max(0, Number(e.target.value) || 0) })} /></label>
              <input className="input h-9 text-[13px]" placeholder="Extra a tener en cuenta" defaultValue={space.agreement_extra} onBlur={(e) => saveSpace({ id: space.id, agreement_extra: e.target.value })} />
              <textarea rows={2} className="input text-[13px]" placeholder="Condiciones (qué incluye y qué no)" defaultValue={space.agreement_notes} onBlur={(e) => saveSpace({ id: space.id, agreement_notes: e.target.value })} />
            </div>
          ) : (
            <div className="space-y-3">
              {bar('Videos y reels', videos, space.quota_videos)}
              {bar('Posts, carruseles y gráficas', statics, space.quota_static)}
              <div className="flex justify-between text-[12.5px] text-muted"><span>Historias</span><b className="text-ink">{stories}</b></div>
              {extras > 0 && <div className="flex justify-between text-[12.5px] text-muted"><span>★ Extras fuera del acuerdo</span><b className="text-ink">{extras}</b></div>}
              {space.agreement_extra && <p className="rounded-lg bg-surface-2 px-2.5 py-2 text-xs"><b>Extra:</b> {space.agreement_extra}</p>}
              <p className="text-xs text-muted">{space.agreement_notes || 'Sin condiciones especiales.'}</p>
            </div>
          )}
        </section>
      </aside>
    </div>
  )
}
