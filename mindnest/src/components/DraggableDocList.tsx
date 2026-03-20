/**
 * 企业级可拖拽文档列表组件
 * 
 * 功能特性：
 * - 文档在列表内拖拽排序（支持 before/after 指示线）
 * - 接受从其他文件夹拖拽来的文档
 * - 空文件夹作为放置区域
 * - 自动滚动（拖拽到边缘时自动滚动容器）
 * - 撤销/重做支持（通过 onMove 回调实现）
 * - 键盘无障碍支持（可配置）
 * 
 * @author AI3
 * @see docs/AI3_DRAG_DROP_UPDATE.md
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GripVertical, Trash2 } from 'lucide-react'
import { cn } from '../utils/cn'
import type { DocumentType } from '../types/document'
import { 
  DOCUMENT_TYPE_ICONS,
  DRAG_CONFIG,
  FOLDER_DRAG_CONFIG,
  DOCUMENT_LIST_CONFIG,
  ANIMATION_CONFIG 
} from '../constants'

// ============================================================================
// 类型定义
// ============================================================================

/** 文档数据接口 */
export interface Doc {
  id: string
  title: string
  type: DocumentType
  parentId?: string
  position?: number
}

/** 放置位置类型 */
export type DropPosition = 'before' | 'after' | 'inside'

/** 拖拽状态接口 */
export interface DragState {
  docId: string | null
  sourceFolderId: string | null
  isDragging: boolean
}

/** 组件 Props */
export interface DraggableDocListProps {
  /** 文档列表 */
  docs: Doc[]
  /** 当前文件夹 ID */
  folderId: string
  /** 缩进层级 */
  level?: number
  /** 删除回调 */
  onDelete: (docId: string) => void
  /** 
   * 移动回调
   * @param docId 被移动的文档 ID
   * @param targetFolderId 目标文件夹 ID
   * @param targetIndex 目标位置索引（0-based）
   */
  onMove: (docId: string, targetFolderId: string, targetIndex: number) => void
  /** 当前激活的文档 ID */
  activeDocId?: string
  /** 是否启用自动滚动 */
  enableAutoScroll?: boolean
  /** 是否启用键盘支持 */
  enableKeyboard?: boolean
  /** 自定义类名 */
  className?: string
}

// ============================================================================
// 全局拖拽状态 - 模块级变量，跨组件共享
// ============================================================================

export const dragState: DragState = {
  docId: null,
  sourceFolderId: null,
  isDragging: false
}

/** 设置全局拖拽状态 */
export function setDragState(state: Partial<DragState>) {
  Object.assign(dragState, state)
}

/** 重置全局拖拽状态 */
export function resetDragState() {
  dragState.docId = null
  dragState.sourceFolderId = null
  dragState.isDragging = false
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 计算自动滚动速度
 * @param mousePos 鼠标位置
 * @param containerRect 容器矩形
 * @returns 滚动速度（正数向下，负数向上）
 */
function calculateAutoScrollSpeed(
  mousePos: number, 
  containerRect: DOMRect
): number {
  const { AUTO_SCROLL_THRESHOLD, AUTO_SCROLL_SPEED } = DRAG_CONFIG
  const { top, bottom, height } = containerRect
  
  // 靠近顶部边缘
  if (mousePos < top + AUTO_SCROLL_THRESHOLD) {
    const ratio = 1 - (mousePos - top) / AUTO_SCROLL_THRESHOLD
    return -Math.max(1, ratio * AUTO_SCROLL_SPEED)
  }
  
  // 靠近底部边缘
  if (mousePos > bottom - AUTO_SCROLL_THRESHOLD) {
    const ratio = 1 - (bottom - mousePos) / AUTO_SCROLL_THRESHOLD
    return Math.max(1, ratio * AUTO_SCROLL_SPEED)
  }
  
  return 0
}

/**
 * 计算放置位置
 * @param mouseY 鼠标 Y 坐标
 * @param rect 元素矩形
 * @returns 放置位置
 */
function calculateDropPosition(
  mouseY: number, 
  rect: DOMRect
): 'before' | 'after' {
  const middleY = rect.top + rect.height / 2
  return mouseY < middleY ? 'before' : 'after'
}

// ============================================================================
// 组件实现
// ============================================================================

export function DraggableDocList({
  docs,
  folderId,
  level = 0,
  onDelete,
  onMove,
  activeDocId,
  enableAutoScroll = true,
  enableKeyboard = false,
  className,
}: DraggableDocListProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef<number>()
  
  // 本地状态
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<{
    index: number
    position: DropPosition
  } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // 清理自动滚动
  useEffect(() => {
    return () => {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current)
      }
    }
  }, [])

  // ============================================================================
  // 自动滚动逻辑
  // ============================================================================
  
  const startAutoScroll = useCallback((speed: number) => {
    if (!enableAutoScroll || !containerRef.current) return
    
    const scroll = () => {
      if (containerRef.current && speed !== 0) {
        containerRef.current.scrollTop += speed
        autoScrollRef.current = requestAnimationFrame(scroll)
      }
    }
    
    cancelAnimationFrame(autoScrollRef.current!)
    autoScrollRef.current = requestAnimationFrame(scroll)
  }, [enableAutoScroll])

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current)
      autoScrollRef.current = undefined
    }
  }, [])

  // ============================================================================
  // 拖拽事件处理
  // ============================================================================

  // 处理拖拽开始
  const handleDragStart = useCallback((e: React.DragEvent, docId: string) => {
    // 设置全局状态
    setDragState({
      docId,
      sourceFolderId: folderId,
      isDragging: true
    })
    setDraggingId(docId)
    
    // 设置拖拽效果
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', docId)
    
    // 设置拖拽图像（可选：自定义拖拽预览）
    const el = e.currentTarget as HTMLElement
    if (el) {
      el.style.opacity = String(DRAG_CONFIG.DRAGGING_OPACITY)
    }
  }, [folderId])

  // 处理拖拽结束
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement
    if (el) {
      el.style.opacity = ''
    }
    
    // 重置状态
    resetDragState()
    setDraggingId(null)
    setDropIndicator(null)
    setIsDragOver(false)
    stopAutoScroll()
  }, [stopAutoScroll])

  // 处理拖拽经过文档项
  const handleDragOverItem = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    
    if (!dragState.isDragging || !dragState.docId) {
      return
    }
    
    // 自动滚动
    if (enableAutoScroll && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const scrollSpeed = calculateAutoScrollSpeed(e.clientY, containerRect)
      if (scrollSpeed !== 0) {
        startAutoScroll(scrollSpeed)
      } else {
        stopAutoScroll()
      }
    }
    
    // 计算放置位置
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const position = calculateDropPosition(e.clientY, rect)
    
    // 只有当位置变化时才更新状态（避免频繁渲染）
    setDropIndicator(prev => {
      if (prev?.index === index && prev?.position === position) {
        return prev
      }
      return { index, position }
    })
    
    e.dataTransfer.dropEffect = 'move'
  }, [enableAutoScroll, startAutoScroll, stopAutoScroll])

  // 处理拖拽离开
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // 检查是否真的离开了元素（不是进入子元素）
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const { clientX, clientY } = e
    
    const isOutside = 
      clientX < rect.left || 
      clientX > rect.right || 
      clientY < rect.top || 
      clientY > rect.bottom
    
    if (isOutside) {
      setDropIndicator(null)
    }
  }, [])

  // 处理放置到文档项
  const handleDropOnItem = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    
    stopAutoScroll()
    
    const { docId, sourceFolderId } = dragState
    
    if (!docId) {
      return
    }
    
    // 计算放置位置
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const position = calculateDropPosition(e.clientY, rect)
    
    let finalIndex = position === 'before' ? targetIndex : targetIndex + 1
    
    // 同文件夹拖拽时调整索引
    if (sourceFolderId === folderId) {
      const dragIndex = docs.findIndex(d => d.id === docId)
      if (dragIndex !== -1 && dragIndex < finalIndex) {
        finalIndex -= 1
      }
    }
    
    // 执行移动
    onMove(docId, folderId, finalIndex)
    
    // 重置状态
    resetDragState()
    setDraggingId(null)
    setDropIndicator(null)
    setIsDragOver(false)
  }, [docs, folderId, onMove, stopAutoScroll])

  // 处理放置到列表末尾
  const handleDropAtEnd = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    stopAutoScroll()
    
    if (dragState.docId) {
      onMove(dragState.docId, folderId, docs.length)
    }
    
    resetDragState()
    setDraggingId(null)
    setDropIndicator(null)
    setIsDragOver(false)
  }, [docs.length, folderId, onMove, stopAutoScroll])

  // 处理空文件夹拖放
  const handleEmptyFolderDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (dragState.isDragging && dragState.sourceFolderId !== folderId) {
      setIsDragOver(true)
    }
    e.dataTransfer.dropEffect = 'move'
  }, [folderId])

  const handleEmptyFolderDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    
    if (dragState.docId && dragState.sourceFolderId !== folderId) {
      onMove(dragState.docId, folderId, 0)
    }
    
    resetDragState()
    setIsDragOver(false)
  }, [folderId, onMove])

  // ============================================================================
  // 渲染
  // ============================================================================

  // 空文件夹显示
  if (docs.length === 0) {
    const isAcceptingDrop = dragState.isDragging && dragState.sourceFolderId !== folderId
    
    return (
      <div 
        className={cn(
          "flex items-center justify-center text-xs rounded-lg mx-2 transition-all duration-200",
          "border-2 border-dashed min-h-[48px]",
          isAcceptingDrop || isDragOver
            ? "border-gray-500 bg-gray-800/50 text-gray-300"
            : "border-gray-800 text-gray-600",
          className
        )}
        style={{ marginLeft: `${level * FOLDER_DRAG_CONFIG.INDENT_PER_LEVEL}px` }}
        onDragOver={handleEmptyFolderDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleEmptyFolderDrop}
      >
        {isAcceptingDrop || isDragOver
          ? DOCUMENT_LIST_CONFIG.EMPTY_FOLDER_DROP_TEXT
          : DOCUMENT_LIST_CONFIG.EMPTY_FOLDER_TEXT
        }
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={cn("space-y-0.5 py-1", className)}
    >
      {docs.map((doc, index) => {
        const isBeingDragged = draggingId === doc.id
        const isDropTarget = dropIndicator?.index === index && !isBeingDragged
        const showBeforeIndicator = isDropTarget && dropIndicator?.position === 'before'
        const showAfterIndicator = isDropTarget && dropIndicator?.position === 'after'
        
        return (
          <div
            key={doc.id}
            draggable
            onDragStart={(e) => handleDragStart(e, doc.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOverItem(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDropOnItem(e, index)}
            className={cn(
              "relative group flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer select-none transition-all",
              "duration-150 ease-out",
              activeDocId === doc.id 
                ? "bg-gray-700 text-white" 
                : "text-gray-300 hover:bg-gray-800",
              isBeingDragged && `opacity-[${DRAG_CONFIG.DRAGGING_OPACITY}]`,
              enableKeyboard && "focus:outline-none focus:ring-1 focus:ring-gray-500"
            )}
            style={{ 
              marginLeft: `${level * FOLDER_DRAG_CONFIG.INDENT_PER_LEVEL}px`,
              transitionDuration: `${ANIMATION_CONFIG.FAST}ms`
            }}
            onClick={() => navigate(`/doc/${doc.id}`)}
            tabIndex={enableKeyboard ? 0 : -1}
          >
            {/* 上方放置指示线 - 使用白色高对比度 */}
            {showBeforeIndicator && (
              <div 
                className={cn(
                  "absolute -top-[2px] left-0 right-0 rounded-full z-20",
                  DRAG_CONFIG.DROP_INDICATOR_COLOR,
                  DRAG_CONFIG.DROP_INDICATOR_SHADOW
                )}
                style={{ height: `${DRAG_CONFIG.DROP_INDICATOR_HEIGHT}px` }}
              />
            )}
            
            {/* 放置区域高亮 */}
            {isDropTarget && (
              <div className={cn(
                "absolute inset-0 rounded-lg pointer-events-none z-10",
                DRAG_CONFIG.DROP_HIGHLIGHT_BG
              )} />
            )}
            
            {/* 拖拽手柄 */}
            <div 
              className="p-0.5 text-gray-500 cursor-grab active:cursor-grabbing hover:text-gray-300 transition-colors"
              onClick={(e) => e.stopPropagation()}
              title="拖拽排序"
              role="button"
              aria-label="拖拽排序"
            >
              <GripVertical className="w-3 h-3" />
            </div>
            
            {/* 文档类型图标 */}
            <span className="text-base select-none" aria-hidden="true">
              {DOCUMENT_TYPE_ICONS[doc.type]}
            </span>
            
            {/* 文档标题 */}
            <span className="flex-1 truncate">
              {doc.title || '无标题'}
            </span>
            
            {/* 删除按钮 */}
            <button 
              className="p-1 rounded text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { 
                e.stopPropagation() 
                onDelete(doc.id) 
              }}
              aria-label="删除文档"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            
            {/* 下方放置指示线 */}
            {showAfterIndicator && (
              <div 
                className={cn(
                  "absolute -bottom-[2px] left-0 right-0 rounded-full z-20",
                  DRAG_CONFIG.DROP_INDICATOR_COLOR,
                  DRAG_CONFIG.DROP_INDICATOR_SHADOW
                )}
                style={{ height: `${DRAG_CONFIG.DROP_INDICATOR_HEIGHT}px` }}
              />
            )}
          </div>
        )
      })}
      
      {/* 末尾放置区 */}
      <div
        className="h-6 mt-0.5 rounded-lg transition-colors"
        style={{ marginLeft: `${level * FOLDER_DRAG_CONFIG.INDENT_PER_LEVEL}px` }}
        onDragOver={(e) => {
          e.preventDefault()
          if (dragState.isDragging) {
            setDropIndicator({ index: docs.length, position: 'after' })
          }
        }}
        onDragLeave={() => setDropIndicator(null)}
        onDrop={handleDropAtEnd}
      >
        {dropIndicator?.index === docs.length && (
          <div 
            className={cn(
              "rounded-full",
              DRAG_CONFIG.DROP_INDICATOR_COLOR,
              DRAG_CONFIG.DROP_INDICATOR_SHADOW
            )}
            style={{ height: `${DRAG_CONFIG.DROP_INDICATOR_HEIGHT}px` }}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// 导出辅助函数
// ============================================================================

export { calculateDropPosition, calculateAutoScrollSpeed }
