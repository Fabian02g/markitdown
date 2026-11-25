import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronLeft, ChevronRight, ExternalLink, MessageSquare, PencilLine, X } from 'lucide-react'
import { supabase, coverUrl } from '../lib/supabase'
import { IGGrid, StoriesRow } from '../components/Content'
import { TypeIcon } from '../components/TypeIcon'
import { Badge, Segmented } from '../components/ui'
import { PIECE_TYPE } from '../lib/constants'
import { fmt, monthLabel, shiftMonth, todayKey } from '../lib/dates'
import { driveId } from '../components/PieceModal'
import type { Approval, PieceStatus, PieceType } from '../lib/types'

interface PPiece {
  id: string; title: string; type: PieceType; status: PieceStatus; approval: Approval; concept: string; copy: string; channels: string[]
  publish_date: string; publish_time: string | null; design_url: string; video_url: string; images: string[]
  comments: { author: 'cliente' | 'yo'; author_name: string; kind: string; body: string; created_at: string }[]
}
interface PData { client: { name: string; color: string }; owner: string; month: string; brief: string | null; months: string[]; pieces: PPiece[] }

const APPROVAL_LABEL: Record<Approval, [string, string]> = {
  sin_enviar: ['Para revisar', '#a1a1aa'], pendiente: ['Para revisar', '#fb923c'], aprobado: ['Aprobado', '#34d399'], cambios: ['Cambios pedidos', '#f87171'],
}

export default function Portal() {
  const { token = '' } = useParams()
  const [month, setMonth] = useState(todayKey().slice(0, 7))
  const [data, setData] = useState<PData | null | undefined>(undefined)
  const [open, setOpen] = useState<string | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [first, setFirst] = useState(true)

  const load = useCallback(async (m: string) => {
    const { data: d, error } = await supabase.rpc('portal_get', { p_token: token, p_month: m })
    if (error) { setData(null); return }
    setData((d as PData) ?? null)
    return d as PData | null
  }, [token])

  useEffect(() => {
    load(month).then((d) => {
      // la primera vez, saltar al próximo mes que tenga contenido si este está vacío
      if (first && d && d.pieces.length === 0 && d.months.length) {
        const next = [...d.months].sort().find((x) => x >= month) ?? [...d.months].sort().pop()!
        if (next !== month) setMonth(next)
      }
      setFirst(false)
    })
  }, [month, load]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { document.title = data?.client ? `${data.client.name} · Contenido` : 'Contenido' }, [data])

  if (data === undefined) return <div className="grid min-h-full place-items-center text-sm text-muted">Cargando…</div>
  if (data === null) return (
    <div className="grid min-h-full place-items-center px-6 text-center">
      <div><h1 className="text-xl font-semibold">Enlace no disponible</h1><p className="mt-2 text-sm text-muted">Este enlace no existe o fue renovado. Pedí uno nuevo.</p></div>
    </div>
  )

  const piece = data.pieces.find((p) => p.id === open)
  const approved = data.pieces.filter((p) => p.approval === 'aprobado').length
  const days = [...new Set(data.pieces.map((p) => p.publish_date))]

  return (
    <div className="min-h-full" style={{ ['--accent' as string]: data.client.color }}>
      <header className="border-b border-line bg-surface/80 backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto max-w-3xl px-4 py-5">
          <div className="kicker mb-1">Propuesta de contenido{data.owner ? ` · ${data.owner}` : ''}</div>
          <h1 className="text-2xl font-semibold tracking-tight">{data.client.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="btn btn-icon btn-sm" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior"><ChevronLeft size={16} /></button>
            <span className="min-w-[120px] text-center text-sm font-semibold">{monthLabel(month)}</span>
            <button className="btn btn-icon btn-sm" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mes siguiente"><ChevronRight size={16} /></button>
            <span className="ml-auto text-xs text-muted">{approved}/{data.pieces.length} aprobadas</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 pb-16">
        {data.brief && <p className="card mb-5 whitespace-pre-wrap p-4 text-sm text-muted">{data.brief}</p>}
        {data.pieces.length === 0 ? <p className="py-16 text-center text-sm text-muted">Todavía no hay contenido para {monthLabel(month).toLowerCase()}.</p> : <>
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-xs text-muted">Tocá cada publicación para verla, aprobarla o dejar un comentario.</p>
            <Segmented value={view} onChange={setView} options={[['grid', 'Grilla'], ['list', 'Por día']]} />
          </div>
          {view === 'grid' ? <>
            <StoriesRow pieces={data.pieces} onOpen={setOpen} />
            <IGGrid pieces={data.pieces} onOpen={setOpen} showStatus={false} />
            <div className="mx-auto mt-3 flex max-w-[560px] flex-wrap gap-3 text-[11px] text-muted">
              {data.pieces.filter((p) => p.type !== 'historia').length > 0 && <span>Orden: lo más nuevo arriba a la izquierda, como en tu perfil.</span>}
            </div>
          </> : (
            <div className="space-y-5">
              {days.map((d) => (
                <div key={d}>
                  <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted">{fmt(d, "EEEE d 'de' MMMM")}</div>
                  <div className="space-y-2">
                    {data.pieces.filter((p) => p.publish_date === d).map((p) => (
                      <button key={p.id} onClick={() => setOpen(p.id)} className="card flex w-full items-center gap-3 p-2.5 text-left hover:border-line-strong">
                        <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-3">{p.images[0] ? <img src={coverUrl(p.images[0])} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-muted"><TypeIcon type={p.type} size={18} /></span>}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{p.title}</span>
                          <span className="text-xs text-muted">{PIECE_TYPE[p.type].label}{p.publish_time ? ' · ' + p.publish_time : ''}</span>
                        </span>
                        <Badge color={APPROVAL_LABEL[p.approval][1]}>{APPROVAL_LABEL[p.approval][0]}</Badge>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>}
      </main>

      <AnimatePresence>{piece && <PieceSheet key={piece.id} token={token} piece={piece} onClose={() => setOpen(null)} onDone={() => load(month)} />}</AnimatePresence>
    </div>
  )
}

function PieceSheet({ token, piece, onClose, onDone }: { token: string; piece: PPiece; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(() => { try { return localStorage.getItem('portal-name') || '' } catch { return '' } })
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'none' | 'cambios' | 'comentario'>('none')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [img, setImg] = useState(0)
  const tx = useRef<number | null>(null)
  const vid = driveId(piece.video_url || '')
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k); document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [onClose])

  const send = async (kind: 'aprobado' | 'cambios' | 'comentario') => {
    if (kind !== 'aprobado' && !text.trim()) { setErr('Escribí qué te gustaría cambiar o comentar.'); return }
    setBusy(true); setErr('')
    try { localStorage.setItem('portal-name', name) } catch { /* */ }
    const { error } = await supabase.rpc('portal_feedback', { p_token: token, p_piece: piece.id, p_kind: kind, p_body: text.trim(), p_name: name })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setText(''); setMode('none'); onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-[3px]" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className="modal-surface relative flex max-h-[95dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <button className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white" onClick={onClose} aria-label="Cerrar"><X size={16} /></button>
        <div className="overflow-y-auto">
          {piece.images.length > 0 && (
            <div className="relative bg-black">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.img key={img} src={coverUrl(piece.images[img])} alt={piece.title}
                  className={clsx('mx-auto max-h-[60dvh] w-full touch-pan-y object-contain', piece.type === 'historia' && 'max-h-[70dvh]')}
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}
                  onTouchStart={(e) => { tx.current = e.touches[0].clientX }}
                  onTouchEnd={(e) => {
                    if (tx.current === null) return
                    const dx = e.changedTouches[0].clientX - tx.current; tx.current = null
                    if (dx < -45 && img < piece.images.length - 1) setImg(img + 1); else if (dx > 45 && img > 0) setImg(img - 1)
                  }} />
              </AnimatePresence>
              {piece.images.length > 1 && <>
                <button className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white disabled:opacity-30" disabled={img === 0} onClick={() => setImg(img - 1)} aria-label="Anterior"><ChevronLeft size={16} /></button>
                <button className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white disabled:opacity-30" disabled={img === piece.images.length - 1} onClick={() => setImg(img + 1)} aria-label="Siguiente"><ChevronRight size={16} /></button>
                <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">{piece.images.map((_, i) => <span key={i} className={clsx('h-1.5 w-1.5 rounded-full', i === img ? 'bg-white' : 'bg-white/40')} />)}</div>
              </>}
            </div>
          )}
          {vid && <iframe src={`https://drive.google.com/file/d/${vid}/preview`} className="aspect-[9/16] max-h-[60dvh] w-full bg-black" allow="autoplay" title="Video" />}
          <div className="space-y-4 p-5">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="inline-flex items-center gap-1"><TypeIcon type={piece.type} size={12} />{PIECE_TYPE[piece.type].label}</span>
                <span>{fmt(piece.publish_date, "EEEE d 'de' MMMM")}{piece.publish_time ? ' · ' + piece.publish_time : ''}</span>
                {piece.channels.length > 0 && <span>{piece.channels.join(', ')}</span>}
                <Badge color={APPROVAL_LABEL[piece.approval][1]}>{APPROVAL_LABEL[piece.approval][0]}</Badge>
              </div>
              <h2 className="text-lg font-semibold">{piece.title}</h2>
            </div>
            {piece.concept && <p className="whitespace-pre-wrap text-sm text-muted">{piece.concept}</p>}
            {piece.copy && <div><div className="label">Texto de la publicación</div><p className="whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-sm">{piece.copy}</p></div>}
            {piece.design_url && <a href={piece.design_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm"><ExternalLink size={13} />Ver diseño completo</a>}

            {piece.comments.length > 0 && (
              <div className="space-y-2">
                <div className="label">Conversación</div>
                {piece.comments.map((c, i) => (
                  <div key={i} className={clsx('rounded-xl px-3 py-2 text-sm', c.author === 'cliente' ? 'mr-6 bg-surface-2' : 'ml-6 bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]')}>
                    <div className="mb-0.5 text-[11px] text-muted"><b className="text-ink">{c.author_name || (c.author === 'cliente' ? 'Cliente' : 'Agencia')}</b> · {new Date(c.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}{c.kind === 'aprobado' ? ' · ✅ aprobó' : c.kind === 'cambios' ? ' · ✏️ pidió cambios' : ''}</div>
                    {c.body && <p className="whitespace-pre-wrap">{c.body}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2 border-t border-line p-4 pb-safe">
          {mode !== 'none' && (
            <div className="space-y-2 fade-in">
              <input className="input h-9" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} />
              <textarea autoFocus rows={3} className="input" placeholder={mode === 'cambios' ? 'Ej.: cambiar esta palabra, probar otro color…' : 'Escribí tu comentario…'} value={text} onChange={(e) => setText(e.target.value)} />
            </div>
          )}
          {err && <p className="text-xs text-danger">{err}</p>}
          {mode === 'none' ? (
            <div className="grid grid-cols-3 gap-2">
              <button className="btn col-span-1" onClick={() => setMode('comentario')}><MessageSquare size={15} />Comentar</button>
              <button className="btn col-span-1" onClick={() => setMode('cambios')}><PencilLine size={15} />Cambios</button>
              <button className="btn btn-primary col-span-1" disabled={busy || piece.approval === 'aprobado'} onClick={() => send('aprobado')}><Check size={15} />{piece.approval === 'aprobado' ? 'Aprobado' : 'Aprobar'}</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button className="btn flex-1" onClick={() => { setMode('none'); setErr('') }}>Cancelar</button>
              <button className="btn btn-primary flex-1" disabled={busy} onClick={() => send(mode)}>{busy ? 'Enviando…' : mode === 'cambios' ? 'Pedir cambios' : 'Enviar'}</button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
