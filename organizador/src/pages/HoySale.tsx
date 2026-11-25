import { useMemo } from 'react'
import { Megaphone } from 'lucide-react'
import clsx from 'clsx'
import { PieceRow } from '../components/Content'
import { PageHead } from '../components/ui'
import { addDaysKey, fmt, todayKey } from '../lib/dates'
import { byPublish, useSpaceMap } from '../lib/selectors'
import { useStore } from '../lib/store'
import type { Piece } from '../lib/types'

export default function HoySale() {
  const pieces = useStore((s) => s.pieces)
  const map = useSpaceMap()
  const T = todayKey(), tm = addDaysKey(T, 1), wk = addDaysKey(T, 7)
  const g = useMemo(() => {
    const s = (f: (p: Piece) => boolean) => pieces.filter(f).sort(byPublish)
    return {
      late: s((p) => !!p.publish_date && p.publish_date < T && p.status !== 'publicado'),
      today: s((p) => p.publish_date === T),
      tomorrow: s((p) => p.publish_date === tm),
      next: s((p) => !!p.publish_date && p.publish_date > tm && p.publish_date <= wk),
    }
  }, [pieces, T, tm, wk])
  const doneToday = g.today.filter((p) => p.status === 'publicado').length
  const Sec = ({ title, list, empty, danger }: { title: string; list: Piece[]; empty: string; danger?: boolean }) => (
    <section className={clsx('card card-pad mb-4', danger && list.length > 0 && 'border-danger/30')}>
      <h2 className={clsx('h2 mb-2', danger && list.length > 0 && 'text-danger')}>{title} <span className="text-muted">{list.length}</span></h2>
      {list.length ? <div className="space-y-0.5">{list.map((p) => <PieceRow key={p.id} piece={p} space={map.get(p.space_id)} />)}</div> : <p className="text-sm text-muted">{empty}</p>}
    </section>
  )
  return (
    <>
      <PageHead kicker={fmt(T, "EEEE d 'de' MMMM")} title={<><Megaphone size={22} className="text-accent-2" />Hoy sale</>}>
        <span className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs">{doneToday} de {g.today.length} publicadas hoy</span>
      </PageHead>
      <p className="mb-4 text-sm text-muted">Tocá el círculo cuando subas cada pieza: queda registrada como publicada y se cancelan sus recordatorios.</p>
      {g.late.length > 0 && <Sec title="Atrasadas" list={g.late} empty="" danger />}
      <Sec title="Hoy" list={g.today} empty="No hay publicaciones programadas para hoy." />
      <Sec title={`Mañana · ${fmt(tm)}`} list={g.tomorrow} empty="Nada programado para mañana." />
      <Sec title="Próximos 7 días" list={g.next} empty="Nada más en los próximos días." />
    </>
  )
}
