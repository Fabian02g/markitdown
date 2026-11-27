import { useMemo, useState } from 'react'
import { Copy, ExternalLink, MessageSquare, Plus, Receipt, RefreshCw, Share2 } from 'lucide-react'
import { MonthGrid, MonthNav } from './Calendar'
import { IGGrid, PieceRow, StoriesRow } from './Content'
import { ConfirmButton, Empty, Progress, Segmented } from './ui'
import { PIECE_TYPE, PLAN_STAGES } from '../lib/constants'
import { localDay, monthLabel, todayKey } from '../lib/dates'
import { byPublish, toAgenda, useSpaceMap } from '../lib/selectors'
import { openModal, rotatePortal, savePiece, savePlan, saveSpace, toast, useStore } from '../lib/store'
import type { Piece, PieceType, Space } from '../lib/types'
import { TypeIcon } from './TypeIcon'

export function portalUrl(s: Space) { return `${location.origin}/c/${s.portal_token}` }

export function ClientPlan({ space, month, setMonth }: { space: Space; month: string; setMonth: (m: string) => void }) {
  const pieces = useStore((s) => s.pieces)
  const plan = useStore((s) => s.plans.find((p) => p.space_id === space.id && p.month === month))
  const comments = useStore((s) => s.comments)
  const map = useSpaceMap()
  const [view, setView] = useState<'cal' | 'list' | 'grid'>(() => (matchMedia('(max-width: 640px)').matches ? 'list' : 'cal'))
  const [editAg, setEditAg] = useState(false)

  const monthPs = useMemo(() => pieces.filter((p) => p.space_id === space.id && p.publish_date?.slice(0, 7) === month).sort(byPublish), [pieces, space.id, month])
  const undated = pieces.filter((p) => p.space_id === space.id && !p.publish_date && !p.is_extra)
  const agenda = useMemo(() => toAgenda([], monthPs, map), [monthPs, map])
  const counted = monthPs.filter((p) => !p.is_extra)
  const videos = counted.filter((p) => PIECE_TYPE[p.type].video).length
  const statics = counted.filter((p) => !PIECE_TYPE[p.type].video && !PIECE_TYPE[p.type].story).length
  const stories = monthPs.filter((p) => p.type === 'historia').length
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

  // acuerdo vigente del mes: el especial del mes si existe, si no el general del cliente
  const qVideos = plan?.quota_videos ?? space.quota_videos
  const qStatic = plan?.quota_static ?? space.quota_static
  const notes = plan?.agreement_notes ?? space.agreement_notes
  const special = plan != null && (plan.quota_videos != null || plan.quota_static != null || plan.agreement_notes != null)
  const overVideos = Math.max(0, videos - qVideos), overStatic = Math.max(0, statics - qStatic)
  const byType = (Object.keys(PIECE_TYPE) as PieceType[]).map((t) => [t, monthPs.filter((p) => p.type === t).length] as const).filter(([, n]) => n > 0)
  const published = monthPs.filter((p) => p.status === 'publicado').length
  // extras del mes: por fecha de publicación, de entrega o de creación
  const extraMonth = (p: Piece) => (p.publish_date ?? p.delivery_date ?? localDay(p.created_at)).slice(0, 7)
  const extraList = pieces.filter((p) => p.space_id === space.id && p.is_extra && extraMonth(p) === month)
  const toBill = extraList.filter((p) => !p.extra_billed)
  const toBillAmount = toBill.reduce((a, p) => a + (Number(p.extra_amount) || 0), 0)
  const money = (n: number) => n.toLocaleString('es-PY', { maximumFractionDigits: 0 })

  const bar = (label: string, n: number, goal: number) => (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-[12.5px]"><span className="text-muted">{label}</span><b className={goal && n > goal ? 'text-warn' : goal && n >= goal ? 'text-ok' : ''}>{n}{goal ? ` / ${goal}` : ''}</b></div>
      {goal > 0 && <Progress value={(n / goal) * 100} color={n > goal ? 'var(--warn)' : space.color} />}
    </div>
  )

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
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
      </section>

      <aside className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <section className="card card-pad">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="h2">Brief del mes</h2>
            <select className="input h-8 w-auto py-0 text-xs" value={plan?.stage ?? 0} onChange={(e) => savePlan(space.id, month, { stage: Number(e.target.value) })} aria-label="Etapa del plan">
              {PLAN_STAGES.map((st, i) => <option key={st} value={i}>Etapa: {st}</option>)}
            </select>
          </div>
          <textarea key={month} rows={4} className="input" defaultValue={plan?.brief ?? ''} placeholder={`Qué comunica ${space.name} este mes y qué pidió el cliente…`}
            onBlur={(e) => e.target.value !== (plan?.brief ?? '') && savePlan(space.id, month, { brief: e.target.value })} />
          <div className="mt-2 flex gap-1">{PLAN_STAGES.map((st, i) => <span key={st} title={st} className="h-1 flex-1 rounded-full" style={{ background: i <= (plan?.stage ?? 0) ? space.color : 'var(--surface-3)' }} />)}</div>
        </section>

        <section className="card card-pad">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="h2">Lo que acordamos</h2>
            <button className="text-xs text-accent-2 hover:underline" onClick={() => setEditAg(!editAg)}>{editAg ? 'Cerrar' : 'Editar'}</button>
          </div>
          {special && !editAg && <p className="mb-2 inline-flex rounded-md bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] px-2 py-0.5 text-[11px] font-medium text-accent-2">Acuerdo especial de {monthLabel(month).toLowerCase()}</p>}
          {editAg ? <AgreementEditor key={month + String(special)} space={space} month={month} videos={qVideos} statics={qStatic} notes={notes} special={special} onDone={() => setEditAg(false)} /> : (
            <div className="space-y-3">
              {bar('Videos y reels', videos, qVideos)}
              {bar('Fotos, carruseles y gráficas (sin historias)', statics, qStatic)}
              {stories > 0 && <div className="flex justify-between text-[12.5px] text-muted"><span>Historias</span><b className="text-ink">{stories}</b></div>}
              {(overVideos > 0 || overStatic > 0) && (
                <p className="rounded-lg border border-warn/30 bg-warn/10 px-2.5 py-2 text-xs text-warn">
                  Te pasaste del acuerdo: {[overVideos && `+${overVideos} video${overVideos > 1 ? 's' : ''}`, overStatic && `+${overStatic} gráfica${overStatic > 1 ? 's' : ''}`].filter(Boolean).join(' y ')}. Si fue un pedido aparte, marcalo como extra para cobrarlo.
                </p>
              )}
              {space.agreement_extra && <p className="rounded-lg bg-surface-2 px-2.5 py-2 text-xs"><b>Extra:</b> {space.agreement_extra}</p>}
              <p className="text-xs text-muted">{notes || 'Sin condiciones especiales.'}</p>
            </div>
          )}
        </section>

        <section className="card card-pad">
          <h2 className="h2 mb-2">Piezas del mes</h2>
          {byType.length === 0 ? <p className="text-[13px] text-muted">Todavía no hay piezas este mes.</p> : (
            <div className="space-y-1.5">
              {byType.map(([t, n]) => (
                <div key={t} className="flex items-center justify-between text-[13px]"><span className="flex items-center gap-2 text-muted"><TypeIcon type={t} size={13} />{PIECE_TYPE[t].label}</span><b>{n}</b></div>
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-[12px] text-muted"><span>Total · publicadas</span><b className="text-ink">{monthPs.length} · {published}</b></div>
            </div>
          )}
        </section>

        <section className={'card card-pad ' + (toBill.length ? 'border-warn/40' : '')}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="h2 flex items-center gap-2"><Receipt size={15} className={toBill.length ? 'text-warn' : 'text-accent-2'} />Extras</h2>
            <button className="btn btn-sm" onClick={() => openModal({ type: 'piece', preset: { space_id: space.id, is_extra: true, share_with_client: false, type: 'otro', delivery_date: month === todayKey().slice(0, 7) ? todayKey() : `${month}-01` } })}><Plus size={13} />Extra</button>
          </div>
          {extraList.length === 0 ? <p className="text-[13px] text-muted">Nada extra este mes. Cuando {space.name} te pida algo fuera del acuerdo, agregalo acá para no olvidarte de cobrarlo.</p> : <>
            {toBill.length > 0 && <p className="mb-2 text-[12.5px] font-medium text-warn">Por cobrar: {toBill.length}{toBillAmount ? ` · ${money(toBillAmount)}` : ''}</p>}
            <div className="space-y-1">
              {extraList.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg px-1 py-1 text-[13px] hover:bg-surface-2">
                  <input type="checkbox" className="h-4 w-4 shrink-0 accent-[var(--ok)]" checked={p.extra_billed} onChange={(e) => savePiece({ id: p.id, extra_billed: e.target.checked })} aria-label="Cobrado" title="Ya lo cobré" />
                  <button className={'min-w-0 flex-1 truncate text-left ' + (p.extra_billed ? 'text-faint line-through' : '')} onClick={() => openModal({ type: 'piece', id: p.id })}>{p.title}</button>
                  {p.extra_amount ? <span className="text-xs tabular-nums text-muted">{money(Number(p.extra_amount))}</span> : null}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-faint">Tildá cuando lo cobres.</p>
          </>}
        </section>

        {undated.length > 0 && (
          <section className="card card-pad">
            <h2 className="h2 mb-1">Piezas sin día <span className="text-muted">{undated.length}</span></h2>
            <p className="mb-2 text-xs text-muted">Ideas que todavía no tienen fecha de publicación.</p>
            {undated.map((p) => <PieceRow key={p.id} piece={p} showSpace={false} />)}
          </section>
        )}

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
      </aside>
    </div>
  )
}

/** Editar el acuerdo: solo para este mes (p. ej. "en noviembre 1 video") o para todos los meses */
function AgreementEditor({ space, month, videos, statics, notes, special, onDone }: {
  space: Space; month: string; videos: number; statics: number; notes: string; special: boolean; onDone: () => void
}) {
  const [v, setV] = useState(videos), [st, setSt] = useState(statics), [n, setN] = useState(notes)
  const [extra, setExtra] = useState(space.agreement_extra)
  const [scope, setScope] = useState<'month' | 'all'>(special ? 'month' : 'all')
  const save = async () => {
    if (scope === 'month') {
      await savePlan(space.id, month, { quota_videos: v, quota_static: st, agreement_notes: n })
      if (extra !== space.agreement_extra) await saveSpace({ id: space.id, agreement_extra: extra })
    } else {
      await saveSpace({ id: space.id, quota_videos: v, quota_static: st, agreement_notes: n, agreement_extra: extra })
      if (special) await savePlan(space.id, month, { quota_videos: null, quota_static: null, agreement_notes: null })
    }
    toast(scope === 'month' ? `Acuerdo de ${monthLabel(month).toLowerCase()} guardado` : 'Acuerdo guardado para todos los meses', { tone: 'ok' })
    onDone()
  }
  return (
    <div className="space-y-2.5">
      <label className="flex items-center justify-between gap-2 text-xs text-muted">Videos / reels por mes<input type="number" min={0} className="input h-8 w-20" value={v} onChange={(e) => setV(Math.max(0, Number(e.target.value) || 0))} /></label>
      <label className="flex items-center justify-between gap-2 text-xs text-muted">Fotos, carruseles o gráficas<input type="number" min={0} className="input h-8 w-20" value={st} onChange={(e) => setSt(Math.max(0, Number(e.target.value) || 0))} /></label>
      <textarea rows={2} className="input text-[13px]" placeholder="Condiciones (ej.: solo publicación, sin community management…)" value={n} onChange={(e) => setN(e.target.value)} />
      <input className="input h-9 text-[13px]" placeholder="Extra a tener en cuenta (ej.: CM a partir de enero)" value={extra} onChange={(e) => setExtra(e.target.value)} />
      <div className="seg w-full">
        <button type="button" className={'flex-1 ' + (scope === 'month' ? 'on' : '')} onClick={() => setScope('month')}>Solo {monthLabel(month).split(' ')[0].toLowerCase()}</button>
        <button type="button" className={'flex-1 ' + (scope === 'all' ? 'on' : '')} onClick={() => setScope('all')}>Todos los meses</button>
      </div>
      <button className="btn btn-primary btn-sm w-full" onClick={save}>Guardar acuerdo</button>
    </div>
  )
}
