import { useEffect, useState } from 'react'
import { BellRing, Download, Share, X } from 'lucide-react'
import { motion } from 'motion/react'
import { canPromptInstall, currentSubscription, enablePush, isIOS, isStandalone, onInstallChange, promptInstall, pushSupported } from '../lib/push'
import { toast } from '../lib/store'

const KEY = 'setup-card-dismissed'

/** Tarjeta de primeros pasos: instalar la app y activar avisos. Se oculta sola cuando está todo listo. */
export function SetupCard() {
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(KEY) === '1' } catch { return false } })
  const [hasPush, setHasPush] = useState<boolean | null>(null)
  const [, force] = useState(0)
  useEffect(() => onInstallChange(() => force((n) => n + 1)), [])
  useEffect(() => { currentSubscription().then((s) => setHasPush(Boolean(s))).catch(() => setHasPush(false)) }, [])

  const mobile = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
  const standalone = isStandalone()
  const needInstall = mobile && !standalone
  const needPush = hasPush === false && (pushSupported() || (isIOS() && !standalone))
  if (dismissed || hasPush === null || (!needInstall && !needPush)) return null

  const close = () => { setDismissed(true); try { localStorage.setItem(KEY, '1') } catch { /* */ } }
  const activate = async () => { const r = await enablePush(); toast(r.msg, { tone: r.ok ? 'ok' : 'error' }); if (r.ok) setHasPush(true) }

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden p-4 sm:p-5"
      style={{ borderColor: 'color-mix(in srgb, var(--accent) 45%, var(--border))' }}>
      <button className="btn btn-ghost absolute right-1 top-1 h-10 w-10 px-0 text-muted" onClick={close} aria-label="Ocultar"><X size={16} /></button>
      <div className="flex items-start gap-3 pr-8">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}>
          {needInstall ? <Download size={18} /> : <BellRing size={18} />}
        </span>
        <div className="min-w-0">
          {needInstall ? <>
            <h2 className="h2">Instalá Mi Panel en tu celular</h2>
            {isIOS() ? (
              <p className="mt-1 text-[13px] text-muted">
                En Safari tocá <Share size={13} className="inline -mt-0.5" /> <b className="text-ink">Compartir</b> → <b className="text-ink">Agregar a inicio</b>.
                Después abrila desde ese ícono: así se ve a pantalla completa y te llegan los recordatorios.
              </p>
            ) : canPromptInstall() ? (
              <button className="btn btn-primary btn-sm mt-2" onClick={async () => { if (await promptInstall()) toast('¡Instalada! Abrila desde tu pantalla de inicio', { tone: 'ok' }) }}><Download size={14} />Instalar app</button>
            ) : (
              <p className="mt-1 text-[13px] text-muted">Abrí el menú del navegador (⋮) y tocá <b className="text-ink">Instalar app</b> o <b className="text-ink">Agregar a pantalla de inicio</b>.</p>
            )}
          </> : <>
            <h2 className="h2">Activá los recordatorios</h2>
            <p className="mt-1 text-[13px] text-muted">Te avisamos antes de cada publicación, entrega y reunión, aunque la app esté cerrada.</p>
            <button className="btn btn-primary btn-sm mt-2" onClick={activate}><BellRing size={14} />Activar notificaciones</button>
          </>}
        </div>
      </div>
    </motion.section>
  )
}
