/**
 * DnD Provider - 使用 @dnd-kit/core
 * 支持拖拽排序和跨文件夹移动
 */
import { 
  DndContext, 
  closestCenter, 
  closestCorners,
  PointerSensor, 
  useSensor, 
  useSensors, 
  type DragEndEvent, 
  type DragStartEvent,
  type DragOverEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  type DropAnimation,
  TouchSensor,
  MouseSensor,
} from '@dnd-kit/core'
import type { ReactNode } from 'react'

interface DndProviderProps {
  children: ReactNode
  onDragEnd: (event: DragEndEvent) => void
  onDragStart?: (event: DragStartEvent) => void
  onDragOver?: (event: DragOverEvent) => void
}

export function DndProvider({ children, onDragEnd, onDragStart, onDragOver }: DndProviderProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      {children}
    </DndContext>
  )
}

// 默认拖拽动画配置
export const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
}

export { DragOverlay }
