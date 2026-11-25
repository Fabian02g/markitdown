import { Clapperboard, Film, GalleryHorizontalEnd, Image, MoreHorizontal, Smartphone, Type } from 'lucide-react'
import type { PieceType } from '../lib/types'

const MAP = { post: Image, carrusel: GalleryHorizontalEnd, historia: Smartphone, reel: Clapperboard, video: Film, texto: Type, otro: MoreHorizontal }

export function TypeIcon({ type, size = 14, className }: { type: PieceType; size?: number; className?: string }) {
  const I = MAP[type] ?? Image
  return <I size={size} className={className} />
}
