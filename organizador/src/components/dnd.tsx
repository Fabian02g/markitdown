import type { ReactNode } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, useDraggable, useDroppable, useSensor, useSensors,
  pointerWithin, rectIntersection, type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { useState } from 'react'
import clsx from 'clsx'

// Soltar donde está el puntero/dedo; si no hay nada debajo, usar la superposición
const collision: CollisionDetection = (args) => { const p = pointerWithin(args); return p.length ? p : rectIntersection(args) }

export function DnD({ children, onDrop, overlay }: {
  children: ReactNode
  onDrop: (dragId: string, dropId: string) => void
  overlay?: (dragId: string) => ReactNode
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )
  const [active, setActive] = useState<string | null>(null)
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={(e: DragStartEvent) => { setActive(String(e.active.id)); navigator.vibrate?.(10) }}
      onDragCancel={() => setActive(null)}
      onDragEnd={(e: DragEndEvent) => { setActive(null); if (e.over) onDrop(String(e.active.id), String(e.over.id)) }}
    >
      {children}
      <DragOverlay dropAnimation={null}>{active && overlay ? <div className="rotate-2 opacity-90">{overlay(active)}</div> : null}</DragOverlay>
    </DndContext>
  )
}

export function Draggable({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={clsx('touch-manipulation', isDragging && 'opacity-30', className)}>
      {children}
    </div>
  )
}

export function Droppable({ id, children, className, overClass = 'ring-2 ring-[var(--accent)] ring-inset' }: { id: string; children: ReactNode; className?: string; overClass?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return <div ref={setNodeRef} className={clsx(className, isOver && overClass)}>{children}</div>
}
