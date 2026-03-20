/**
 * 简化版可拖拽文档项 - React DnD
 * 参考用户的简洁实现风格
 */
import { useRef } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { GripVertical, Trash2 } from 'lucide-react'
import { cn } from '../../utils/cn'
import type { DocumentType } from '../../stores/document'

// 拖拽类型
export const ItemTypes = {
  DOCUMENT: 'document',
  FOLDER: 'folder',
} as const

// 拖拽项数据接口
export interface DragItem {
  type: string
  id: string
  index: number
  folderId: string
  title: string
}

interface SimpleDocItemProps {
  id: string
  title: string
  type: DocumentType
  index: number
  folderId: string
  level: number
  isActive: boolean
  onDelete: (id: string) => void
  onClick: () => void
  onMove: (dragIndex: number, hoverIndex: number, dragFolderId: string) => void
}

export function SimpleDocItem({
  id,
  title,
  type,
  index,
  folderId,
  level,
  isActive,
  onDelete,
  onClick,
  onMove,
}: SimpleDocItemProps) {
  const ref = useRef<HTMLDivElement>(null)

  // 1. Drop 逻辑 - 允许其他文档拖放到当前位置
  const [{ isOver, canDrop }, drop] = useDrop<DragItem, unknown, { isOver: boolean; canDrop: boolean }>({
    accept: ItemTypes.DOCUMENT,
    canDrop: (item) => {
      // 不能拖到自己
      return item.id !== id
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
    drop: (item) => {
      // 放置时触发移动
      onMove(item.index, index, item.folderId)
    },
  })

  // 2. Drag 逻辑 - 当前项可拖拽
  const [{ isDragging }, drag, preview] = useDrag<DragItem, unknown, { isDragging: boolean }>({
    type: ItemTypes.DOCUMENT,
    item: { 
      type: ItemTypes.DOCUMENT,
      id, 
      index, 
      folderId,
      title,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  // 将 drag 和 drop 连接到同一个 ref（这样每项既是拖拽源又是放置目标）
  drag(drop(ref))

  // 样式
  const opacity = isDragging ? 0.5 : 1
  const isOverActive = isOver && canDrop

  // 文档图标
  const docIcon = type === 'document' ? '📄' :
                  type === 'whiteboard' ? '🎨' :
                  type === 'spreadsheet' ? '📊' : '📝'

  return (
    <div
      ref={ref}
      className={cn(
        "relative group flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer select-none",
        "transition-all duration-150 ease-out",
        isActive 
          ? "bg-gray-700 text-white" 
          : "text-gray-300 hover:bg-gray-800",
        isOverActive && "ring-1 ring-gray-500 bg-gray-800/50"
      )}
      style={{ 
        marginLeft: `${level * 12}px`,
        opacity,
      }}
      onClick={onClick}
    >
      {/* 放置指示线 - 悬停时显示 */}
      {isOverActive && (
        <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)] z-20 rounded-full" />
      )}

      {/* 拖拽手柄 */}
      <div
        ref={drag} // 手柄也可以触发拖拽
        className="p-0.5 text-gray-500 cursor-grab active:cursor-grabbing hover:text-gray-300 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3 h-3" />
      </div>

      {/* 文档图标 */}
      <span className="text-base select-none">{docIcon}</span>

      {/* 标题 */}
      <span className="flex-1 truncate">{title || '无标题'}</span>

      {/* 删除按钮 */}
      <button
        className="p-1 rounded text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onDelete(id) }}
      >
        <Trash2 className="w-3 h-3" />
      </button>

      {/* 底部放置线（如果是最后一个元素） */}
      {isOverActive && (
        <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)] z-20 rounded-full" />
      )}
    </div>
  )
}
