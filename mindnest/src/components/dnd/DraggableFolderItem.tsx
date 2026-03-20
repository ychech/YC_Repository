/**
 * 可拖拽文件夹项组件 - React DnD 实现
 */
import { useRef, useState } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { ChevronDown, ChevronRight, Folder, FolderOpen, Plus, MoreHorizontal, Trash2 } from 'lucide-react'
import { cn } from '../../utils/cn'
import { DragItemType, type FolderDragItem, type DocumentDragItem, type DragCollectedProps, type DropCollectedProps } from './types'

interface DraggableFolderItemProps {
  folder: {
    id: string
    name: string
    parentId?: string
    position?: number
  }
  index: number
  level: number
  isExpanded: boolean
  hasChildren: boolean
  childCount: number
  onToggle: () => void
  onDelete: () => void
  onShowCreateMenu: (e: React.MouseEvent) => void
  onMove: (dragIndex: number, hoverIndex: number, targetParentId: string | null, position: 'before' | 'after' | 'inside') => void
  onMoveDocToFolder: (docId: string, targetFolderId: string, position: 'inside' | 'before' | 'after') => void
  children?: React.ReactNode
}

export function DraggableFolderItem({
  folder,
  index,
  level,
  isExpanded,
  hasChildren,
  childCount,
  onToggle,
  onDelete,
  onShowCreateMenu,
  onMove,
  onMoveDocToFolder,
  children,
}: DraggableFolderItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null)

  // 文件夹拖拽源
  const [{ isDragging }, drag, preview] = useDrag<FolderDragItem, unknown, DragCollectedProps>({
    type: DragItemType.FOLDER,
    item: {
      type: DragItemType.FOLDER,
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      position: folder.position,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  // 文件夹放置目标（接受文件夹和文档）
  const [{ isOver, canDrop }, drop] = useDrop<FolderDragItem | DocumentDragItem, unknown, DropCollectedProps>({
    accept: [DragItemType.FOLDER, DragItemType.DOCUMENT],
    canDrop: (item) => {
      // 文件夹不能拖到自己或自己的子文件夹中
      if (item.type === DragItemType.FOLDER) {
        if (item.id === folder.id) return false
        // TODO: 检查是否拖到自己的子文件夹中
      }
      return true
    },
    hover: (item, monitor) => {
      if (!ref.current) return

      // 计算鼠标相对于元素的位置
      const hoverBoundingRect = ref.current.getBoundingClientRect()
      const hoverClientY = monitor.getClientOffset()!.y - hoverBoundingRect.top
      const hoverHeight = hoverBoundingRect.bottom - hoverBoundingRect.top
      const hoverRatio = hoverClientY / hoverHeight

      // 确定放置位置
      let newPosition: 'before' | 'after' | 'inside'
      if (hoverRatio < 0.25) {
        newPosition = 'before'
      } else if (hoverRatio > 0.75) {
        newPosition = 'after'
      } else {
        newPosition = 'inside'
      }

      setDropPosition(newPosition)
    },
    drop: (item, monitor) => {
      if (!dropPosition) return

      if (item.type === DragItemType.DOCUMENT) {
        // 文档放置到文件夹
        onMoveDocToFolder(item.id, folder.id, dropPosition)
      } else if (item.type === DragItemType.FOLDER && item.id !== folder.id) {
        // 文件夹排序 - 只处理 before/after，inside 表示成为子文件夹
        if (dropPosition === 'before' || dropPosition === 'after') {
          const dragIndex = item.position || 0
          onMove(dragIndex, index, folder.parentId || null, dropPosition)
        } else if (dropPosition === 'inside') {
          // 成为子文件夹
          onMoveDocToFolder(item.id, folder.id, 'inside')
        }
      }

      setDropPosition(null)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
      dropPosition: null,
    }),
  })

  // 将 drag 和 drop 连接到同一个 ref
  drag(drop(ref))

  // 拖拽手柄
  const handleRef = useRef<HTMLDivElement>(null)
  drag(handleRef)

  return (
    <div className="select-none">
      {/* 上方放置指示线 */}
      {isOver && canDrop && dropPosition === 'before' && (
        <div className="rounded-full mx-2 my-1 h-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
      )}

      {/* 文件夹头部 */}
      <div
        ref={ref}
        className={cn(
          "group flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-all",
          "duration-150 ease-out",
          isOver && dropPosition === 'inside' && canDrop
            ? "bg-gray-800 ring-1 ring-gray-600"
            : "hover:bg-gray-800",
          isDragging && "opacity-50"
        )}
        style={{ paddingLeft: `${8 + level * 12}px` }}
      >
        {/* 展开/折叠按钮 */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          className="p-0.5 rounded hover:bg-gray-700 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
          )}
        </button>

        {/* 拖拽手柄 */}
        <div
          ref={handleRef}
          className="p-0.5 text-gray-500 cursor-grab active:cursor-grabbing hover:text-gray-300 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="sr-only">拖拽排序</span>
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="2" cy="3" r="1.5" />
            <circle cx="2" cy="9" r="1.5" />
            <circle cx="10" cy="3" r="1.5" />
            <circle cx="10" cy="9" r="1.5" />
          </svg>
        </div>

        {/* 文件夹信息 */}
        <div
          className="flex items-center gap-2 flex-1 min-w-0"
          onClick={onToggle}
        >
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-gray-500 flex-shrink-0" />
          )}
          <span className="truncate font-medium text-gray-300">
            {folder.name}
          </span>
          {childCount > 0 && (
            <span className="text-xs text-gray-600">
              {childCount}
            </span>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1 rounded hover:bg-gray-700 text-gray-400"
            onClick={(e) => {
              e.stopPropagation()
              onShowCreateMenu(e)
            }}
            title="新建"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <div className="relative">
            <button
              className="p-1 rounded hover:bg-gray-700 text-gray-400"
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-32 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50 py-1">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-gray-800"
                    onClick={() => { onDelete(); setShowMenu(false) }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    删除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 文件夹内容 */}
      {isExpanded && (
        <div className="space-y-0.5 mt-0.5">
          {children}
        </div>
      )}

      {/* 下方放置指示线 */}
      {isOver && canDrop && dropPosition === 'after' && (
        <div className="rounded-full mx-2 my-1 h-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
      )}
    </div>
  )
}
