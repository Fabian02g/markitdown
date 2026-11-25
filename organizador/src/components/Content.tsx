import clsx from 'clsx'
import { Check, MessageSquare } from 'lucide-react'
import { APPROVAL, PIECE_STATUS, PIECE_TYPE } from '../lib/constants'
import { hm, relDay } from '../lib/dates'
import { isPieceLate } from '../lib/selectors'
import { openModal, savePiece, useStore } from '../lib/store'
import { coverUrl } from '../lib/supabase'
import type { Piece, Space } from '../lib/types'
import { Badge, Dot } from './ui'
import { TypeIcon } from './TypeIcon'

export function PieceRow({ piece, space, showSpace = true }: { piece: Piece; space?: Space; showSpace?: boolean }) {
  const st = PIECE_STATUS[piece.status]
  const done = piece.status === 'publicado'
  const late = isPieceLate(piece)
  const unresolved = useStore((s) => s.comments.filter((c) => c.piece_id === piece.id && c.author === 'cliente' && !c.resolved && c.kind !== 'aprobado').length)
  return (
    <div className={clsx('group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-surface-2', late && 'bg-danger/[.06]')}>
      <button
        onClick={() => savePiece({ id: piece.id, status: done ? 'programado' : 'publicado' })}
        className={clsx('grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2 transition-all active:scale-90', done ? 'border-transparent bg-ok text-white' : 'border-line-strong hover:border-ok')}
        aria-label={done ? 'Desmarcar publicada' : 'Marcar como publicada'} title={done ? 'Publicada' : 'Marcar como publicada'}
      >{done && <Check size={13} strokeWidth={3} />}</button>
      <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => openModal({ type: 'piece', id: piece.id })}>
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-3">
          {piece.images[0] ? <img src={coverUrl(piece.images[0])} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="grid h-full w-full place-items-center text-muted"><TypeIcon type={piece.type} size={16} /></span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className={clsx('truncate text-[14px] font-medium', done && 'text-faint line-through')}>{piece.is_extra && '★ '}{piece.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted">
            <span className={clsx(late && 'font-medium text-danger')}>{relDay(piece.publish_date)}{piece.publish_time ? ' · ' + hm(piece.publish_time) : ''}</span>
            <span className="inline-flex items-center gap-1"><TypeIcon type={piece.type} size={11} />{PIECE_TYPE[piece.type].label}</span>
            {showSpace && space && <span className="inline-flex items-center gap-1"><Dot color={space.color} size={6} />{space.name}</span>}
            {piece.approval !== 'sin_enviar' && <span style={{ color: APPROVAL[piece.approval].color }}>{APPROVAL[piece.approval].label}</span>}
            {unresolved > 0 && <span className="inline-flex items-center gap-1 font-medium text-warn"><MessageSquare size={11} />{unresolved}</span>}
          </div>
        </div>
        <Badge color={st.color} className="hidden sm:inline-flex">{st.label}</Badge>
      </button>
    </div>
  )
}

/** Grilla estilo perfil de Instagram: lo más nuevo arriba a la izquierda */
export function IGGrid({ pieces, onOpen, showStatus = true }: { pieces: (Pick<Piece, 'id' | 'title' | 'type' | 'images' | 'status' | 'publish_date'> & { publish_time?: string | null; approval?: string })[]; onOpen: (id: string) => void; showStatus?: boolean }) {
  const feed = pieces.filter((p) => p.type !== 'historia')
    .sort((a, b) => `${b.publish_date}${b.publish_time ?? ''}`.localeCompare(`${a.publish_date}${a.publish_time ?? ''}`))
  if (!feed.length) return <p className="py-10 text-center text-sm text-muted">No hay publicaciones de feed este mes.</p>
  return (
    <div className="mx-auto grid max-w-[560px] grid-cols-3 gap-[3px] overflow-hidden rounded-xl">
      {feed.map((p) => {
        const st = PIECE_STATUS[p.status]
        return (
          <button key={p.id} onClick={() => onOpen(p.id)} className="group relative aspect-[4/5] overflow-hidden bg-surface-3 text-left" title={p.title}>
            {p.images[0]
              ? <img src={coverUrl(p.images[0])} alt={p.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
              : <div className="flex h-full w-full flex-col bg-gradient-to-br from-surface-2 to-surface-3 p-2 pb-7 pt-8">
                  <span className="line-clamp-5 text-[11px] font-medium leading-snug text-ink sm:text-[13px]">{p.title}</span>
                </div>}
            {(p.type === 'reel' || p.type === 'video' || p.type === 'carrusel') && (
              <span className="absolute right-1.5 top-1.5 rounded bg-black/55 p-0.5 text-white"><TypeIcon type={p.type} size={13} /></span>
            )}
            <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">{p.publish_date ? p.publish_date.slice(8) + '/' + p.publish_date.slice(5, 7) : ''} · {PIECE_TYPE[p.type].label}</span>
            {showStatus && <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: st.color }} />}
            {p.approval === 'aprobado' && <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ok text-[11px] font-bold text-white" title="Aprobado">✓</span>}
            {p.approval === 'cambios' && <span className="absolute left-1.5 top-1.5 rounded-full bg-danger px-1.5 text-[10px] font-semibold text-white" title="Cambios pedidos">Cambios</span>}
          </button>
        )
      })}
    </div>
  )
}

export function StoriesRow({ pieces, onOpen }: { pieces: Pick<Piece, 'id' | 'title' | 'images' | 'publish_date' | 'type'>[]; onOpen: (id: string) => void }) {
  const st = pieces.filter((p) => p.type === 'historia')
  if (!st.length) return null
  return (
    <div className="mx-auto mb-4 flex max-w-[560px] gap-3 overflow-x-auto pb-1 no-scrollbar">
      {st.map((p) => (
        <button key={p.id} onClick={() => onOpen(p.id)} className="flex w-16 shrink-0 flex-col items-center gap-1">
          <span className="rounded-full p-[2px]" style={{ background: 'linear-gradient(45deg,#f59e0b,#ec4899,#8b5cf6)' }}>
            <span className="block h-14 w-14 overflow-hidden rounded-full border-2 border-[var(--bg)] bg-surface-3">
              {p.images[0] ? <img src={coverUrl(p.images[0])} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-muted"><TypeIcon type="historia" size={16} /></span>}
            </span>
          </span>
          <span className="w-full truncate text-center text-[10px] text-muted">{p.publish_date?.slice(8)}/{p.publish_date?.slice(5, 7)} {p.title}</span>
        </button>
      ))}
    </div>
  )
}
