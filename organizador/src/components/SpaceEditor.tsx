import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, Trash2 } from 'lucide-react'
import { SPACE_KIND } from '../lib/constants'
import { deleteSpace, saveSpace, toast, useStore } from '../lib/store'
import type { Space, SpaceKind } from '../lib/types'
import { ColorPicker, ConfirmButton, Field, Modal, TagInput } from './ui'

export function SpaceEditor({ space, kind, onClose }: { space?: Space; kind?: SpaceKind; onClose: () => void }) {
  const nav = useNavigate()
  const count = useStore((s) => s.spaces.length)
  const [d, setD] = useState<Partial<Space>>(() => space ? { ...space } : { name: '', kind: kind ?? 'cliente', color: '#8b5cf6', categories: [], quota_videos: 0, quota_static: 0, sort: count })
  const save = async () => {
    if (!d.name?.trim()) return toast('Poné un nombre')
    const r = await saveSpace(space ? { ...d, name: d.name.trim(), id: space.id } : { ...d, name: d.name.trim() })
    if (r) { onClose(); toast(space ? 'Cambios guardados' : 'Espacio creado', { tone: 'ok' }); if (!space) nav(`/espacio/${r.id}`) }
  }
  return (
    <Modal onClose={onClose} title={space ? `Editar ${space.name}` : `Nuevo ${SPACE_KIND[d.kind as SpaceKind].toLowerCase()}`}
      footer={<>
        {space && <ConfirmButton className="btn-ghost mr-auto text-danger" confirmText="¿Eliminar con todo su contenido?" onConfirm={() => { deleteSpace(space); onClose(); nav('/') }}><Trash2 size={15} />Eliminar</ConfirmButton>}
        {space && <button className="btn btn-ghost" onClick={async () => { await saveSpace({ id: space.id, archived: !space.archived }); onClose(); toast(space.archived ? 'Espacio restaurado' : 'Espacio archivado (podés restaurarlo en Configuración)') }}><Archive size={15} />{space.archived ? 'Restaurar' : 'Archivar'}</button>}
        <button className="btn btn-primary" onClick={save}>Guardar</button>
      </>}>
      <div className="space-y-4">
        <Field label="Nombre"><input autoFocus className="input" value={d.name ?? ''} onChange={(e) => setD({ ...d, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && save()} /></Field>
        {!space && (
          <Field label="Tipo">
            <select className="input" value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as SpaceKind })}>
              {Object.entries(SPACE_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        )}
        <div><span className="label">Color</span><ColorPicker value={d.color ?? '#8b5cf6'} onChange={(c) => setD({ ...d, color: c })} /></div>
        <Field label="Categorías propias (se suman a las generales)"><TagInput value={d.categories ?? []} onChange={(v) => setD({ ...d, categories: v })} placeholder="Ej.: Reels, PDP, Historias…" /></Field>
        {d.kind === 'cliente' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Videos/reels por mes"><input type="number" min={0} className="input" value={d.quota_videos ?? 0} onChange={(e) => setD({ ...d, quota_videos: Number(e.target.value) })} /></Field>
            <Field label="Posts/carruseles por mes"><input type="number" min={0} className="input" value={d.quota_static ?? 0} onChange={(e) => setD({ ...d, quota_static: Number(e.target.value) })} /></Field>
          </div>
        )}
      </div>
    </Modal>
  )
}
