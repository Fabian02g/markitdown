import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TaskExplorer, type DateFilter } from '../components/TaskExplorer'
import { PageHead } from '../components/ui'
import { openModal, useStore } from '../lib/store'

export default function Tareas() {
  const [sp, setSp] = useSearchParams()
  const ready = useStore((s) => s.ready)
  const f = (sp.get('f') as DateFilter) || 'all'
  useEffect(() => {
    const t = sp.get('t')
    if (t && ready) { openModal({ type: 'task', id: t }); sp.delete('t'); setSp(sp, { replace: true }) }
  }, [sp, ready, setSp])
  return (
    <>
      <PageHead kicker="Todas tus tareas" title="Tabla de tareas" />
      <TaskExplorer key={f} initialDate={f} />
    </>
  )
}
