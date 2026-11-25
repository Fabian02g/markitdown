import { useState } from 'react'
import { supabase, configured } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'up') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name.trim() }, emailRedirectTo: location.origin } })
        if (error) throw error
        if (!data.session) setMsg({ t: 'Te enviamos un correo para confirmar la cuenta. Después volvé e ingresá.' })
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/config' })
        if (error) throw error
        setMsg({ t: 'Si el correo existe, te llegó un enlace para crear una contraseña nueva.' })
      }
    } catch (err) {
      const m = (err as Error).message
      setMsg({ err: true, t: m.includes('Invalid login') ? 'Correo o contraseña incorrectos.' : m.includes('already registered') ? 'Ese correo ya tiene cuenta. Ingresá.' : m })
    } finally { setBusy(false) }
  }

  return (
    <div className="grid min-h-full place-items-center px-4 py-10" style={{ background: 'radial-gradient(800px 400px at 20% 0%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 60%), var(--bg)' }}>
      <div className="w-full max-w-sm pop-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl text-lg font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}>M</div>
          <h1 className="text-2xl font-semibold tracking-tight">Mi Panel</h1>
          <p className="mt-1 text-sm text-muted">Tu centro de organización personal y profesional</p>
        </div>
        {!configured && <p className="mb-4 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs">Falta configurar la conexión con Supabase (variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).</p>}
        <form onSubmit={submit} className="card space-y-3 p-5">
          {mode === 'up' && <input className="input" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="given-name" />}
          <input className="input" type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          {mode !== 'reset' && <input className="input" type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} />}
          <button className="btn btn-primary h-11 w-full" disabled={busy}>{busy ? 'Un momento…' : mode === 'in' ? 'Ingresar' : mode === 'up' ? 'Crear cuenta' : 'Enviar enlace'}</button>
          {msg && <p className={msg.err ? 'text-xs text-danger' : 'text-xs text-ok'}>{msg.t}</p>}
        </form>
        <div className="mt-4 flex justify-center gap-4 text-xs text-muted">
          {mode !== 'in' && <button onClick={() => setMode('in')} className="hover:text-ink">Ya tengo cuenta</button>}
          {mode !== 'up' && <button onClick={() => setMode('up')} className="hover:text-ink">Crear cuenta</button>}
          {mode !== 'reset' && <button onClick={() => setMode('reset')} className="hover:text-ink">Olvidé mi contraseña</button>}
        </div>
      </div>
    </div>
  )
}
