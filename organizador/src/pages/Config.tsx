import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Bell, BellOff, Download, LogOut, Moon, Pencil, Plus, Smartphone, Sun, Upload, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { SpaceEditor } from '../components/SpaceEditor'
import { ReminderRules } from '../components/ReminderRules'
import { ColorPicker, Dot, Field, PageHead, TagInput } from '../components/ui'
import { SPACE_KIND } from '../lib/constants'
import { exportJSON, exportPiecesCSV, exportTasksCSV } from '../lib/export'
import { importOldPanel } from '../lib/importer'
import { currentSubscription, disablePush, enablePush, forgetDevice, isIOS, isStandalone, pushSupported, syncPush } from '../lib/push'
import { saveProfile, saveSpace, toast, useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import type { Space } from '../lib/types'

function Section({ id, title, desc, children }: { id?: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card card-pad scroll-mt-20">
      <h2 className="h2">{title}</h2>
      {desc && <p className="mt-0.5 text-xs text-muted">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function Config() {
  const profile = useStore((s) => s.profile)
  const spaces = useStore((s) => s.spaces)
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark')
  const [pushOn, setPushOn] = useState<boolean | null>(null)
  const [devices, setDevices] = useState<{ id: string; device: string; created_at: string; endpoint: string }[]>([])
  const [myEndpoint, setMyEndpoint] = useState('')
  const [editing, setEditing] = useState<Space | 'new' | null>(null)
  const [importMsg, setImportMsg] = useState('')
  const [pwd, setPwd] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const loadDevices = async () => {
    const { data } = await supabase.from('push_subscriptions').select('id,device,created_at,endpoint').order('created_at')
    setDevices(data ?? [])
    const sub = await currentSubscription().catch(() => null)
    setMyEndpoint(sub?.endpoint ?? '')
    setPushOn(Boolean(sub && (data ?? []).some((d) => d.endpoint === sub.endpoint)))
  }
  useEffect(() => { syncPush().finally(loadDevices) }, [])
  useEffect(() => { if (location.hash) document.querySelector(location.hash)?.scrollIntoView() }, [])

  if (!profile) return null
  const sorted = [...spaces].sort((a, b) => a.sort - b.sort)
  const move = async (s: Space, dir: -1 | 1) => {
    const i = sorted.findIndex((x) => x.id === s.id), j = i + dir
    if (j < 0 || j >= sorted.length) return
    const other = sorted[j]
    await Promise.all([saveSpace({ id: s.id, sort: j }), saveSpace({ id: other.id, sort: i })])
  }
  const applyTheme = (t: string) => { setTheme(t); document.documentElement.dataset.theme = t; try { localStorage.setItem('theme', t) } catch { /* */ } }

  return (
    <>
      <PageHead kicker="Ajustes" title="Configuración" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Perfil y apariencia">
          <div className="space-y-4">
            <Field label="Tu nombre (para el saludo)"><input className="input" defaultValue={profile.display_name} onBlur={(e) => e.target.value.trim() && saveProfile({ display_name: e.target.value.trim() })} /></Field>
            <Field label="Frase motivadora"><input className="input" defaultValue={profile.phrase} onBlur={(e) => saveProfile({ phrase: e.target.value })} /></Field>
            <div><span className="label">Color de acento</span><ColorPicker value={profile.accent} onChange={(c) => saveProfile({ accent: c })} /></div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="label mb-0">Tema</span>
              <div className="seg">
                <button className={clsx(theme === 'dark' && 'on', 'flex items-center gap-1.5')} onClick={() => applyTheme('dark')}><Moon size={13} />Oscuro</button>
                <button className={clsx(theme === 'light' && 'on', 'flex items-center gap-1.5')} onClick={() => applyTheme('light')}><Sun size={13} />Claro</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Horas de trabajo por día"><input type="number" min={1} max={16} className="input" defaultValue={profile.work_hours_per_day} onBlur={(e) => saveProfile({ work_hours_per_day: Number(e.target.value) || 8 })} /></Field>
              <Field label="Zona horaria">
                <select className="input" value={profile.timezone} onChange={(e) => saveProfile({ timezone: e.target.value })}>
                  {['America/Asuncion', 'America/Argentina/Buenos_Aires', 'America/Montevideo', 'America/Santiago', 'America/Sao_Paulo', 'America/La_Paz', 'America/Lima', 'America/Bogota', 'America/Mexico_City', 'Europe/Madrid'].map((z) => <option key={z} value={z}>{z.split('/').pop()!.replace('_', ' ')}</option>)}
                </select>
              </Field>
            </div>
          </div>
        </Section>

        <Section id="avisos" title="Recordatorios y notificaciones" desc="Los avisos se envían desde el servidor: te llegan aunque la app esté cerrada.">
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-surface-2/60 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <Smartphone size={18} className="text-muted" />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-medium">Este dispositivo</div>
                  <div className="text-xs text-muted">{pushOn ? `Recibe notificaciones (${isStandalone() ? 'app instalada' : 'navegador'})` : pushSupported() ? 'Notificaciones desactivadas' : isIOS() && !isStandalone() ? 'En iPhone: instalá la app en la pantalla de inicio primero' : 'Este navegador no admite notificaciones'}</div>
                </div>
                {pushOn
                  ? <button className="btn btn-sm" onClick={async () => { await disablePush(); await loadDevices(); toast('Notificaciones desactivadas en este dispositivo') }}><BellOff size={14} />Desactivar</button>
                  : <button className="btn btn-primary btn-sm" onClick={async () => { const r = await enablePush(); toast(r.msg, { tone: r.ok ? 'ok' : 'error' }); loadDevices() }}><Bell size={14} />Activar</button>}
              </div>
              {pushOn && <button className="btn btn-sm mt-3 w-full" onClick={async () => {
                await syncPush(); await loadDevices()
                const { data, error } = await supabase.rpc('send_test_push')
                if (error) return toast('Error: ' + error.message, { tone: 'error' })
                const n = Number(data) || 0
                toast(n ? `Enviada a ${n} dispositivo${n > 1 ? 's' : ''}. Llega en menos de un minuto.` : 'No hay dispositivos registrados: tocá "Activar".', { tone: n ? 'ok' : 'error' })
              }}>Enviar notificación de prueba</button>}
              {devices.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-line pt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Dispositivos con avisos</div>
                  {devices.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 text-xs">
                      <span className="flex-1">{d.device || 'Dispositivo'}{d.endpoint === myEndpoint && <span className="text-accent-2"> · este</span>}</span>
                      <span className="text-faint">{new Date(d.created_at).toLocaleDateString('es')}</span>
                      <button className="text-faint hover:text-danger" aria-label="Quitar dispositivo" onClick={async () => { await supabase.from('push_subscriptions').delete().eq('id', d.id); loadDevices() }}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <span className="label">Avisos por defecto para tareas</span>
              <ReminderRules fixed value={profile.task_rules} defaults={[]} onChange={(v) => saveProfile({ task_rules: v ?? [] })} />
            </div>
            <div>
              <span className="label">Avisos por defecto para publicaciones</span>
              <ReminderRules fixed value={profile.piece_rules} defaults={[]} onChange={(v) => saveProfile({ piece_rules: v ?? [] })} />
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3 text-sm">
              <label className="flex flex-1 items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={profile.digest_enabled} onChange={(e) => saveProfile({ digest_enabled: e.target.checked })} />Resumen diario de lo que sale hoy</label>
              <input type="time" className="input h-9 w-28" value={profile.digest_time.slice(0, 5)} disabled={!profile.digest_enabled} onChange={(e) => e.target.value && saveProfile({ digest_time: e.target.value })} aria-label="Hora del resumen" />
            </div>
          </div>
        </Section>

        <Section title="Espacios" desc="Trabajo fijo, clientes, personal y proyectos. Cambiá nombres, colores u orden; archivá los que ya no uses.">
          <div className="space-y-1">
            {sorted.map((s, i) => (
              <div key={s.id} className={clsx('flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-surface-2', s.archived && 'opacity-50')}>
                <Dot color={s.color} />
                <span className="flex-1 truncate text-sm font-medium">{s.name}</span>
                <span className="hidden text-xs text-muted sm:inline">{SPACE_KIND[s.kind]}{s.archived ? ' · archivado' : ''}</span>
                <button className="btn btn-ghost btn-icon btn-sm" disabled={i === 0} onClick={() => move(s, -1)} aria-label="Subir"><ArrowUp size={14} /></button>
                <button className="btn btn-ghost btn-icon btn-sm" disabled={i === sorted.length - 1} onClick={() => move(s, 1)} aria-label="Bajar"><ArrowDown size={14} /></button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(s)} aria-label={`Editar ${s.name}`}><Pencil size={14} /></button>
              </div>
            ))}
          </div>
          <button className="btn btn-sm mt-3" onClick={() => setEditing('new')}><Plus size={14} />Nuevo espacio</button>
        </Section>

        <Section title="Categorías de tareas" desc="Aparecen como sugerencias al crear tareas. Cada espacio puede sumar las suyas.">
          <TagInput value={profile.categories} onChange={(v) => saveProfile({ categories: v })} placeholder="Agregar categoría" />
        </Section>

        <Section title="Datos" desc="Exportá tu información cuando quieras.">
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-sm" onClick={exportJSON}><Download size={14} />Respaldo completo (JSON)</button>
            <button className="btn btn-sm" onClick={exportTasksCSV}><Download size={14} />Tareas (Excel/CSV)</button>
            <button className="btn btn-sm" onClick={exportPiecesCSV}><Download size={14} />Calendario editorial (CSV)</button>
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-line p-3">
            <div className="text-sm font-medium">Traer datos del panel anterior</div>
            <p className="mt-0.5 text-xs text-muted">En el panel anterior: Configuración → Respaldo → copiá el texto y guardalo como archivo .json. Después subilo acá. Se agregan tareas, piezas (con fotos), planes y acuerdos.</p>
            <input ref={fileRef} type="file" accept=".json,application/json,text/plain" hidden onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = ''
              if (!f) return
              try {
                setImportMsg('Importando…')
                const r = await importOldPanel(await f.text(), setImportMsg)
                setImportMsg(`Listo: ${r.tasks} tareas y ${r.pieces} piezas importadas.`)
              } catch (err) { setImportMsg('No se pudo importar: ' + (err as Error).message) }
            }} />
            <button className="btn btn-sm mt-2" onClick={() => fileRef.current?.click()}><Upload size={14} />Subir respaldo</button>
            {importMsg && <p className="mt-2 text-xs text-muted">{importMsg}</p>}
          </div>
        </Section>

        <Section title="Cuenta">
          <div className="flex flex-wrap gap-2">
            <input type="password" className="input h-9 max-w-[220px]" placeholder="Nueva contraseña" value={pwd} onChange={(e) => setPwd(e.target.value)} minLength={6} />
            <button className="btn btn-sm h-9" disabled={pwd.length < 6} onClick={async () => { const { error } = await supabase.auth.updateUser({ password: pwd }); toast(error ? error.message : 'Contraseña actualizada', { tone: error ? 'error' : 'ok' }); if (!error) setPwd('') }}>Cambiar contraseña</button>
          </div>
          <button className="btn btn-sm mt-4" onClick={async () => { await forgetDevice(); await supabase.auth.signOut() }}><LogOut size={14} />Cerrar sesión</button>
        </Section>
      </div>
      {editing && <SpaceEditor space={editing === 'new' ? undefined : editing} kind={editing === 'new' ? 'cliente' : undefined} onClose={() => setEditing(null)} />}
    </>
  )
}
