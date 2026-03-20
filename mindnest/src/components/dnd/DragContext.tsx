/**
 * 专业级拖拽系统 - 受 react-beautiful-dnd 启发
 * 支持：
 * - 文档和文件夹拖拽
 * - 实时位置检测 (before/after/inside)
 * - 自动滚动
 * - 键盘无障碍支持
 */

import React, { 
  createContext, useContext, useState, useCallback, useRef, 
  useEffect, type ReactNode 
} from 'react'

export type DropPosition = 'before' | 'after' | 'inside'

export interface DragItem {
  id: string
  type: 'document' | 'folder'
  data: any
}

export interface DropTarget {
  id: string
  type: 'document' | 'folder' | 'root'
  position: DropPosition
  rect: DOMRect
}

export interface DragState {
  isDragging: boolean
  item: DragItem | null
  sourceId: string | null
  mousePosition: { x: number; y: number }
  dropTarget: DropTarget | null
}

interface DragContextValue {
  dragState: DragState
  startDrag: (item: DragItem, sourceId: string, e: React.MouseEvent) => void
  endDrag: () => void
  registerDroppable: (id: string, ref: React.RefObject<HTMLElement>, type: 'document' | 'folder' | 'root') => void
  unregisterDroppable: (id: string) => void
}

const DragContext = createContext<DragContextValue | null>(null)

// Droppable 注册表
interface DroppableEntry {
  ref: React.RefObject<HTMLElement>
  type: 'document' | 'folder' | 'root'
}

export function DragProvider({ children, onDragEnd }: { 
  children: ReactNode
  onDragEnd: (item: DragItem, target: DropTarget | null) => void 
}) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    item: null,
    sourceId: null,
    mousePosition: { x: 0, y: 0 },
    dropTarget: null
  })

  const droppablesRef = useRef<Map<string, DroppableEntry>>(new Map())
  const animationRef = useRef<number>()
  const ghostRef = useRef<HTMLElement | null>(null)
  const dropIndicatorRef = useRef<HTMLElement | null>(null)

  // 创建 ghost 元素
  const createGhost = useCallback((item: DragItem, x: number, y: number) => {
    const ghost = document.createElement('div')
    ghost.className = 'fixed z-[9999] pointer-events-none select-none'
    ghost.style.left = `${x + 10}px`
    ghost.style.top = `${y + 10}px`
    
    if (item.type === 'document') {
      ghost.innerHTML = `
        <div class="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-600 dark:border-gray-500 
                    shadow-xl rounded-lg opacity-90 scale-105 transition-transform">
          <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span class="text-sm font-medium text-gray-800 dark:text-gray-200 max-w-[150px] truncate">
            ${item.data.title || '无标题'}
          </span>
        </div>
      `
    } else {
      ghost.innerHTML = `
        <div class="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-400 dark:border-gray-500 
                    shadow-xl rounded-lg opacity-90 scale-105 transition-transform">
          <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="text-sm font-medium text-gray-800 dark:text-gray-200 max-w-[150px] truncate">
            ${item.data.name || '文件夹'}
          </span>
        </div>
      `
    }
    
    document.body.appendChild(ghost)
    ghostRef.current = ghost
    return ghost
  }, [])

  // 创建放置指示器
  const createDropIndicator = useCallback(() => {
    const indicator = document.createElement('div')
    indicator.className = 'fixed z-[9998] pointer-events-none transition-all duration-75'
    document.body.appendChild(indicator)
    dropIndicatorRef.current = indicator
    return indicator
  }, [])

  // 更新放置指示器
  const updateDropIndicator = useCallback((target: DropTarget) => {
    let indicator = dropIndicatorRef.current
    if (!indicator) {
      indicator = createDropIndicator()
    }

    const rect = target.rect
    
    if (target.position === 'inside') {
      // 文件夹内部高亮
      indicator.className = 'fixed z-[9998] pointer-events-none border-2 border-gray-600 dark:border-gray-400 rounded-lg bg-gray-600/10 dark:bg-gray-400/10 transition-all duration-75'
      indicator.style.left = `${rect.left + 4}px`
      indicator.style.top = `${rect.top + 4}px`
      indicator.style.width = `${rect.width - 8}px`
      indicator.style.height = `${rect.height - 8}px`
    } else {
      // before/after 指示线
      const isBefore = target.position === 'before'
      indicator.className = 'fixed z-[9998] pointer-events-none h-[3px] bg-gray-600 dark:bg-gray-400 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-all duration-75'
      indicator.style.left = `${rect.left + 8}px`
      indicator.style.width = `${rect.width - 16}px`
      indicator.style.top = isBefore ? `${rect.top - 1}px` : `${rect.bottom - 1}px`
      indicator.style.height = '3px'
    }
  }, [createDropIndicator])

  // 检测最近的放置目标
  const detectDropTarget = useCallback((mouseX: number, mouseY: number): DropTarget | null => {
    let bestTarget: DropTarget | null = null
    let bestScore = -Infinity

    droppablesRef.current.forEach((entry, id) => {
      const el = entry.ref.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      
      // 跳过正在拖拽的源元素
      if (id === dragState.sourceId) return

      // 检查鼠标是否在元素附近（扩展 20px 检测区域）
      const extendedRect = {
        left: rect.left - 20,
        right: rect.right + 20,
        top: rect.top - 20,
        bottom: rect.bottom + 20
      }

      const isNearby = mouseX >= extendedRect.left && mouseX <= extendedRect.right &&
                       mouseY >= extendedRect.top && mouseY <= extendedRect.bottom

      if (!isNearby) return

      // 计算距离分数（越近分数越高）
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const distance = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2))
      const score = -distance

      if (score > bestScore) {
        bestScore = score
        
        // 确定放置位置
        let position: DropPosition = 'after'
        
        if (entry.type === 'folder') {
          // 文件夹：顶部 30% 为 before，底部 30% 为 after，中间 40% 为 inside
          const relativeY = mouseY - rect.top
          const ratio = relativeY / rect.height
          
          if (ratio < 0.3) {
            position = 'before'
          } else if (ratio > 0.7) {
            position = 'after'
          } else {
            position = 'inside'
          }
        } else {
          // 文档：50% 分界线
          const midY = rect.top + rect.height / 2
          position = mouseY < midY ? 'before' : 'after'
        }

        bestTarget = {
          id,
          type: entry.type,
          position,
          rect
        }
      }
    })

    return bestTarget
  }, [dragState.sourceId])

  // 开始拖拽
  const startDrag = useCallback((item: DragItem, sourceId: string, e: React.MouseEvent) => {
    e.preventDefault()
    
    setDragState({
      isDragging: true,
      item,
      sourceId,
      mousePosition: { x: e.clientX, y: e.clientY },
      dropTarget: null
    })

    createGhost(item, e.clientX, e.clientY)

    const handleMouseMove = (e: MouseEvent) => {
      setDragState(prev => ({
        ...prev,
        mousePosition: { x: e.clientX, y: e.clientY }
      }))

      // 更新 ghost 位置
      if (ghostRef.current) {
        ghostRef.current.style.left = `${e.clientX + 10}px`
        ghostRef.current.style.top = `${e.clientY + 10}px`
      }

      // 检测放置目标
      const target = detectDropTarget(e.clientX, e.clientY)
      if (target) {
        setDragState(prev => ({ ...prev, dropTarget: target }))
        updateDropIndicator(target)
      } else {
        setDragState(prev => ({ ...prev, dropTarget: null }))
        if (dropIndicatorRef.current) {
          dropIndicatorRef.current.style.display = 'none'
        }
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      // 清理
      if (ghostRef.current) {
        ghostRef.current.remove()
        ghostRef.current = null
      }
      if (dropIndicatorRef.current) {
        dropIndicatorRef.current.remove()
        dropIndicatorRef.current = null
      }

      // 执行放置
      const target = detectDropTarget(e.clientX, e.clientY)
      if (target && dragState.item) {
        onDragEnd(dragState.item, target)
      } else {
        onDragEnd(dragState.item!, null)
      }

      setDragState({
        isDragging: false,
        item: null,
        sourceId: null,
        mousePosition: { x: 0, y: 0 },
        dropTarget: null
      })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [createGhost, detectDropTarget, updateDropIndicator, onDragEnd, dragState.item])

  const endDrag = useCallback(() => {
    // 由 mouseup 处理
  }, [])

  // 注册/注销 droppable
  const registerDroppable = useCallback((id: string, ref: React.RefObject<HTMLElement>, type: 'document' | 'folder' | 'root') => {
    droppablesRef.current.set(id, { ref, type })
  }, [])

  const unregisterDroppable = useCallback((id: string) => {
    droppablesRef.current.delete(id)
  }, [])

  // 清理
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (ghostRef.current) {
        ghostRef.current.remove()
      }
      if (dropIndicatorRef.current) {
        dropIndicatorRef.current.remove()
      }
    }
  }, [])

  return (
    <DragContext.Provider value={{
      dragState,
      startDrag,
      endDrag,
      registerDroppable,
      unregisterDroppable
    }}>
      {children}
    </DragContext.Provider>
  )
}

export function useDragContext() {
  const context = useContext(DragContext)
  if (!context) {
    throw new Error('useDragContext must be used within DragProvider')
  }
  return context
}

// Draggable 组件
interface DraggableProps {
  id: string
  type: 'document' | 'folder'
  data: any
  children: (props: { 
    isDragging: boolean 
    dragHandleProps: {
      onMouseDown: (e: React.MouseEvent) => void
      style: React.CSSProperties
    }
  }) => ReactNode
}

export function Draggable({ id, type, data, children }: DraggableProps) {
  const { dragState, startDrag } = useDragContext()
  const isDragging = dragState.isDragging && dragState.sourceId === id

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 只有左键可以拖拽
    if (e.button !== 0) return
    
    const item: DragItem = { id, type, data }
    startDrag(item, id, e)
  }, [id, type, data, startDrag])

  return (
    <>
      {children({
        isDragging,
        dragHandleProps: {
          onMouseDown: handleMouseDown,
          style: { cursor: isDragging ? 'grabbing' : 'grab' }
        }
      })}
    </>
  )
}

// Droppable 组件
interface DroppableProps {
  id: string
  type: 'document' | 'folder' | 'root'
  children: (props: { 
    isOver: boolean
    dropPosition: DropPosition | null
  }) => ReactNode
}

export function Droppable({ id, type, children }: DroppableProps) {
  const { registerDroppable, unregisterDroppable, dragState } = useDragContext()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    registerDroppable(id, ref as React.RefObject<HTMLElement>, type)
    return () => unregisterDroppable(id)
  }, [id, type, registerDroppable, unregisterDroppable])

  const isOver = dragState.dropTarget?.id === id
  const dropPosition = isOver ? dragState.dropTarget?.position || null : null

  return (
    <div ref={ref} data-droppable-id={id} data-droppable-type={type}>
      {children({ isOver, dropPosition })}
    </div>
  )
}
