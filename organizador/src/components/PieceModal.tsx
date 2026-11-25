import { useRef, useState } from 'react'
import clsx from 'clsx'
import { useShallow } from 'zustand/react/shallow'
import { CheckCircle2, ExternalLink, ImagePlus, MessageSquare, Send, Trash2, X } from 'lucide-react'
import { APPROVAL, CHANNELS, PIECE_STATUS, PIECE_STATUS_ORDER, PIECE_TYPE, PILLARS } from '../lib/constants'
import { hm, fmt } from '../lib/dates'
import { useClients } from '../lib/selectors'
import { addComment, closeModal, deletePiece, removeCover, resolveComment, savePiece, toast, uploadCover, useStore } from '../lib/store'
import { coverUrl } from '../lib/supabase'
import type { Approval, Piece, PieceStatus, PieceType } from '../lib/types'
import { ReminderRules } from './ReminderRules'
import { Badge, ConfirmButton, Dot, Field, Modal } from './ui'
import { TypeIcon } from './TypeIcon'

type Draft = Omit<Piece, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export function driveId(url: string) {
  const m = url.match(/\/d\/([A-Za-z0-9_-]+)/) || url.match(/[?&]id=([A-Za-z0-9_-]+)/)
  return m ? m[1] : ''
}

export function PieceModal({ id, preset }: { id?: string; preset?: Partial<Piece> }) {
  const existing = useStore((s) => (id ? s.pieces.find((p) => p.id === id) : undefined))
  const profile = useStore((s) => s.profile)
  const comments = useStore(useShallow((s) => (id ? s.comments.filter((c) => c.piece_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at)) : [])))
  const clients = useClients()
  const [d, setD] = useState<Draft>(() => existing ? { ...existing } : {
    space_id: clients[0]?.id ?? '', title: '', type: 'post', status: 'idea', approval: 'sin_enviar', concept: '', copy: '', pillar: '',
    channels: ['Instagram'], production_date: null, delivery_date: null, publish_date: null, publish_time: null, design_url: '', video_url: '',
    images: [], notes: '', is_extra: false, is_paid: false, share_with_client: true, published_at: null, published_where: '', reminder_rules: null,
    ...preset,
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reply, setReply] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const up = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  if (id && !existing) return null
  if (!clients.length) {
    return <Modal onClose={closeModal} title="Nueva pieza"><p className="text-sm text-muted">Primero creá un cliente en <b>Clientes freelance</b>.</p></Modal>
  }

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!d.title.trim()) return toast('Poné un título o tema')
    if (!d.space_id) return toast('Elegí el cliente')
    setSaving(true)
    const payload: Partial<Piece> = { ...d, title: d.title.trim(), publish_time: d.publish_date && d.publish_time ? hm(d.publish_time) : null }
    const r = await savePiece(existing ? { ...payload, id: existing.id } : payload)
    setSaving(false)
    if (r) { closeModal(); toast(existing ? 'Pieza actualizada' : 'Pieza creada', { tone: 'ok' }) }
  }

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    const paths: string[] = []
    for (const f of Array.from(files)) { const p = await uploadCover(f); if (p) paths.push(p) }
    setUploading(false)
    up('images', [...d.images, ...paths])
  }

  const vid = driveId(d.video_url)

  return (
    <Modal
      wide onClose={closeModal}
      title={existing ? 'Editar pieza' : 'Nueva pieza de contenido'}
      footer={<>
        {existing && <ConfirmButton className="btn-ghost mr-auto text-danger" onConfirm={() => { deletePiece(existing); closeModal() }}><Trash2 size={15} />Eliminar</ConfirmButton>}
        <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => submit()} disabled={saving || uploading}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </>}
    >
      <form onSubmit={submit} className="grid gap-5 md:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <input autoFocus={!existing} className="w-full bg-transparent text-lg font-semibold outline-none placeholder:text-faint" placeholder="Título o tema"
            value={d.title} onChange={(e) => up('title', e.target.value)} />

          <div className="flex flex-wrap gap-1.5">
            {clients.map((c) => (
              <button type="button" key={c.id} className={clsx('chip', d.space_id === c.id && 'chip-on')} onClick={() => up('space_id', c.id)}>
                <Dot color={c.color} size={7} />{c.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(PIECE_TYPE) as PieceType[]).map((t) => (
              <button type="button" key={t} className={clsx('chip', d.type === t && 'chip-on')} onClick={() => up('type', t)}>
                <TypeIcon type={t} size={13} />{PIECE_TYPE[t].label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Publicación"><input type="date" className="input" value={d.publish_date ?? ''} onChange={(e) => up('publish_date', e.target.value || null)} /></Field>
            <Field label="Hora"><input type="time" className="input" disabled={!d.publish_date} value={hm(d.publish_time)} onChange={(e) => up('publish_time', e.target.value || null)} /></Field>
            <Field label="Producción"><input type="date" className="input" value={d.production_date ?? ''} onChange={(e) => up('production_date', e.target.value || null)} /></Field>
            <Field label="Entrega / aprobación"><input type="date" className="input" value={d.delivery_date ?? ''} onChange={(e) => up('delivery_date', e.target.value || null)} /></Field>
          </div>

          <Field label="Idea / concepto (lo ve el cliente)">
            <textarea rows={2} className="input" value={d.concept} onChange={(e) => up('concept', e.target.value)} placeholder="De qué trata, qué se va a mostrar…" />
          </Field>
          <Field label="Copy / caption">
            <textarea rows={4} className="input" value={d.copy} onChange={(e) => up('copy', e.target.value)} />
          </Field>

          <div>
            <span className="label">Diseños e imágenes</span>
            <div className="flex flex-wrap gap-2">
              {d.images.map((p, i) => (
                <div key={p} className="group relative h-20 w-20 overflow-hidden rounded-xl border border-line bg-surface-2">
                  <img src={coverUrl(p)} alt="" className="h-full w-full object-cover" />
                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">{i + 1}</span>
                  <button type="button" aria-label="Quitar imagen" onClick={() => { up('images', d.images.filter((x) => x !== p)); if (!existing?.images.includes(p)) removeCover(p) }}
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 max-sm:opacity-100"><X size={12} /></button>
                </div>
              ))}
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="grid h-20 w-20 place-items-center rounded-xl border border-dashed border-line-strong text-muted transition-colors hover:border-[var(--accent)] hover:text-ink">
                {uploading ? <span className="text-xs">Subiendo…</span> : <ImagePlus size={20} />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Link al diseño (Canva, Drive, Figma…)"><input className="input" value={d.design_url} onChange={(e) => up('design_url', e.target.value)} placeholder="https://" /></Field>
            <Field label="Video en Google Drive"><input className="input" value={d.video_url} onChange={(e) => up('video_url', e.target.value)} placeholder="Link para compartir" /></Field>
          </div>
          {d.video_url && !vid && <p className="-mt-2 text-xs text-danger">Ese link no parece de Google Drive.</p>}
          {vid && <iframe src={`https://drive.google.com/file/d/${vid}/preview`} className="aspect-video w-full rounded-xl border border-line" allow="autoplay" title="Video" />}

          <Field label="Observaciones (solo vos)"><textarea rows={2} className="input" value={d.notes} onChange={(e) => up('notes', e.target.value)} /></Field>

          {existing && (
            <div className="rounded-2xl border border-line p-3">
              <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold"><MessageSquare size={15} />Comentarios del cliente</div>
              {comments.length === 0 && <p className="text-xs text-muted">Todavía no hay comentarios. Compartí el enlace del cliente desde su plan.</p>}
              <div className="space-y-2">
                {comments.map((c) => (
                  <div key={c.id} className={clsx('rounded-xl px-3 py-2 text-sm', c.author === 'yo' ? 'ml-6 bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]' : 'mr-6 bg-surface-2', c.resolved && 'opacity-50')}>
                    <div className="mb-0.5 flex items-center gap-2 text-[11px] text-muted">
                      <b className="text-ink">{c.author === 'yo' ? 'Vos' : c.author_name || 'Cliente'}</b>
                      {c.kind === 'aprobado' && <Badge color="#34d399">Aprobó</Badge>}
                      {c.kind === 'cambios' && <Badge color="#f87171">Pidió cambios</Badge>}
                      <span>{new Date(c.created_at).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      {c.author === 'cliente' && (
                        <button type="button" className="ml-auto inline-flex items-center gap-1 hover:text-ink" onClick={() => resolveComment(c)}>
                          <CheckCircle2 size={12} />{c.resolved ? 'Reabrir' : 'Resuelto'}
                        </button>
                      )}
                    </div>
                    {c.body && <p className="whitespace-pre-wrap">{c.body}</p>}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input className="input h-9" placeholder="Responder al cliente…" value={reply} onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && reply.trim()) { e.preventDefault(); addComment(existing, reply.trim()); setReply('') } }} />
                <button type="button" className="btn btn-icon" disabled={!reply.trim()} onClick={() => { addComment(existing, reply.trim()); setReply('') }} aria-label="Enviar"><Send size={15} /></button>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Field label="Estado">
            <select className="input" value={d.status} onChange={(e) => up('status', e.target.value as PieceStatus)}>
              {PIECE_STATUS_ORDER.map((k) => <option key={k} value={k}>{PIECE_STATUS[k].label}</option>)}
            </select>
          </Field>
          <Field label="Aprobación del cliente">
            <select className="input" value={d.approval} onChange={(e) => up('approval', e.target.value as Approval)}>
              {Object.entries(APPROVAL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>

          {d.status === 'publicado' ? (
            <div className="rounded-xl border border-ok/30 bg-ok/10 p-3 text-sm">
              <div className="flex items-center gap-1.5 font-medium text-ok"><CheckCircle2 size={15} />Publicada</div>
              {d.published_at && <p className="mt-0.5 text-xs text-muted">{fmt(d.published_at.slice(0, 10))} · {new Date(d.published_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</p>}
              <input className="input mt-2 h-9" placeholder="¿Dónde? (Instagram, link…)" value={d.published_where} onChange={(e) => up('published_where', e.target.value)} />
            </div>
          ) : (
            <button type="button" className="btn w-full" onClick={() => setD((x) => ({ ...x, status: 'publicado', published_at: new Date().toISOString(), published_where: x.published_where || x.channels[0] || '' }))}>
              <CheckCircle2 size={15} />Marcar como publicada
            </button>
          )}

          <div>
            <span className="label">Redes</span>
            <div className="flex flex-wrap gap-1.5">
              {CHANNELS.map((c) => (
                <button type="button" key={c} className={clsx('chip', d.channels.includes(c) && 'chip-on')}
                  onClick={() => up('channels', d.channels.includes(c) ? d.channels.filter((x) => x !== c) : [...d.channels, c])}>{c}</button>
              ))}
            </div>
          </div>
          <Field label="Pilar">
            <input className="input" list="pillars" value={d.pillar} onChange={(e) => up('pillar', e.target.value)} />
            <datalist id="pillars">{PILLARS.map((p) => <option key={p} value={p} />)}</datalist>
          </Field>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={d.share_with_client} onChange={(e) => up('share_with_client', e.target.checked)} />Mostrar al cliente</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={d.is_extra} onChange={(e) => up('is_extra', e.target.checked)} />Extra (fuera del acuerdo)</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={d.is_paid} onChange={(e) => up('is_paid', e.target.checked)} />Lleva pauta</label>
          </div>
          {d.publish_date && d.status !== 'publicado' && (
            <ReminderRules value={d.reminder_rules} defaults={profile?.piece_rules ?? []} onChange={(v) => up('reminder_rules', v)} />
          )}
          {d.design_url && <a className="btn btn-sm w-full" href={d.design_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} />Abrir diseño</a>}
        </aside>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
