import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { loadAll, startRealtime, stopRealtime, useStore } from './lib/store'
import { registerSW } from './lib/push'
import { Layout } from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { MotionConfig } from 'motion/react'
import { AppSkeleton } from './components/motion'

const Agenda = lazy(() => import('./pages/Agenda'))
const Semana = lazy(() => import('./pages/Semana'))
const Tareas = lazy(() => import('./pages/Tareas'))
const Editorial = lazy(() => import('./pages/Editorial'))
const HoySale = lazy(() => import('./pages/HoySale'))
const SpacePage = lazy(() => import('./pages/SpacePage'))
const Clientes = lazy(() => import('./pages/Clientes'))
const Proyectos = lazy(() => import('./pages/Clientes').then((m) => ({ default: m.Proyectos })))
const Notas = lazy(() => import('./pages/Notas'))
const Config = lazy(() => import('./pages/Config'))
const Portal = lazy(() => import('./pages/Portal'))

function Splash() {
  return (
    <div className="grid min-h-full place-items-center">
      <div className="h-10 w-10 animate-pulse rounded-2xl" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }} />
    </div>
  )
}

function Authed() {
  const session = useStore((s) => s.session)
  const ready = useStore((s) => s.ready)
  const loc = useLocation()
  if (session === null) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (!ready) return <AppSkeleton />
  return <Layout />
}

export default function App() {
  const session = useStore((s) => s.session)
  const authKnown = useStore((s) => s.ready || s.session !== null)

  useEffect(() => {
    registerSW()
    let first = true
    supabase.auth.getSession().then(({ data }) => {
      useStore.setState({ session: data.session, ready: !data.session })
      if (data.session) { loadAll(); startRealtime() }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((ev, s) => {
      if (first) { first = false; if (ev === 'INITIAL_SESSION') return }
      const prev = useStore.getState().session
      useStore.setState({ session: s })
      if (ev === 'SIGNED_OUT') {
        stopRealtime()
        useStore.setState({ ready: true, profile: null, spaces: [], tasks: [], pieces: [], notes: [], plans: [], comments: [], attachments: [], reminders: [] })
      } else if (s && (!prev || prev.user.id !== s.user.id)) {
        useStore.setState({ ready: false }); loadAll(); startRealtime()
      }
    })
    // abrir la URL de una notificación tocada
    const onMsg = (e: MessageEvent) => { if (e.data?.type === 'navigate' && e.data.url) location.assign(e.data.url) }
    navigator.serviceWorker?.addEventListener('message', onMsg)
    return () => { sub.subscription.unsubscribe(); navigator.serviceWorker?.removeEventListener('message', onMsg) }
  }, [])

  return (
    <MotionConfig reducedMotion="user">
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<Splash />}>
        <ErrorBoundary>
        <Routes>
          <Route path="/c/:token" element={<Portal />} />
          <Route path="/login" element={!authKnown ? <Splash /> : session ? <Navigate to="/" replace /> : <Login />} />
          <Route element={!authKnown ? <Splash /> : <Authed />}>
            <Route index element={<Dashboard />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="semana" element={<Semana />} />
            <Route path="tareas" element={<Tareas />} />
            <Route path="editorial" element={<Editorial />} />
            <Route path="hoy" element={<HoySale />} />
            <Route path="espacio/:id" element={<SpacePage />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="proyectos" element={<Proyectos />} />
            <Route path="notas" element={<Notas />} />
            <Route path="config" element={<Config />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </ErrorBoundary>
      </Suspense>
    </BrowserRouter>
    </MotionConfig>
  )
}
