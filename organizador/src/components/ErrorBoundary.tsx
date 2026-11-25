import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-full place-items-center px-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-lg font-semibold">Algo salió mal</h1>
          <p className="mt-2 text-sm text-muted">Tus datos están guardados. Recargá la página para seguir.</p>
          <p className="mt-2 text-xs text-faint">{this.state.error.message}</p>
          <button className="btn btn-primary mt-4" onClick={() => location.reload()}>Recargar</button>
        </div>
      </div>
    )
  }
}
