/**
 * 可拖拽文件夹组件
 */
import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ChevronRight, ChevronDown, Folder, FolderOpen, Plus, Trash2, FileText, Table2, LayoutGrid, StickyNote } from 'lucide-react'
import { cn } from '../../utils/cn'
import type { DocumentType } from '../../stores/document'

interface SortableFolderProps {
  id: string
  name: string
  isExpanded: boolean
  docCount: number
  level?: number
  isActive?: boolean
  onToggle: () => void
  onCreate?: (type: DocumentType) => void
  onDelete?: () => void
  children?: React.ReactNode
}

export function SortableFolder({
  id,
  name,
  isExpanded,
  docCount,
  level = 0,
  isActive,
  onToggle,
  onCreate,
  onDelete,
  children,
}: SortableFolderProps) {
  const sortableId = `folder-${id}`
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // 文件夹本身可排序
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    data: {
      type: 'folder',
      id,
      folderId: id,
      name,
      isFolder: true,
    },
  })

  // 文件夹可以作为放置目标
  const { setNodeRef: setDroppableRef, isOver, active } = useDroppable({
    id: sortableId,
    data: {
      type: 'folder',
      id,
      folderId: id,
      isFolder: true,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // 判断是否有东西正在被拖到这个文件夹上
  const isReceiving = isOver && active?.id !== sortableId

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowCreateMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCreate = (type: DocumentType) => {
    onCreate?.(type)
    setShowCreateMenu(false)
  }

  return (
    <div
      ref={(el) => {
        setSortableRef(el)
        setDroppableRef(el)
      }}
      style={style}
      className={cn(
        "space-y-0.5",
        isDragging && "opacity-50"
      )}
    >
      {/* 文件夹头部 */}
      <div
        className={cn(
          "group flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer select-none",
          "transition-all duration-150",
          isActive ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-800",
          isReceiving && "bg-blue-500/20 ring-2 ring-blue-500/50 scale-[1.02]",
          isDragging && "opacity-50"
        )}
        style={{ marginLeft: `${level * 12}px` }}
        onClick={onToggle}
      >
        {/* 拖拽手柄 */}
        <div 
          className="p-0.5 text-gray-500 cursor-grab active:cursor-grabbing hover:text-gray-300"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3 h-3" />
        </div>

        {/* 展开/折叠图标 */}
        <span className="text-gray-500">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>

        {/* 文件夹图标 */}
        <span className={cn(
          "transition-colors duration-200",
          isReceiving ? "text-blue-400" : "text-yellow-500"
        )}>
          {isExpanded ? (
            <FolderOpen className="w-4 h-4" />
          ) : (
            <Folder className="w-4 h-4" />
          )}
        </span>

        {/* 文件夹名称 */}
        <span className={cn(
          "flex-1 truncate transition-colors duration-200",
          isReceiving && "text-blue-300"
        )}>
          {name}
        </span>

        {/* 文档数量 */}
        {docCount > 0 && (
          <span className={cn(
            "text-xs transition-colors duration-200",
            isReceiving ? "text-blue-400" : "text-gray-600"
          )}>
            {docCount}
          </span>
        )}

        {/* 操作按钮组 */}
        {!isReceiving && (
          <div 
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 新建按钮（带下拉菜单） */}
            {onCreate && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowCreateMenu(!showCreateMenu)
                  }}
                  className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-blue-400 transition-colors"
                  title="在此文件夹下新建"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                
                {/* 创建菜单 */}
                {showCreateMenu && (
                  <>
                    {/* 遮罩层 */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowCreateMenu(false)} 
                    />
                    {/* 菜单内容 */}
                    <div className="absolute right-0 top-full mt-1 w-40 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
                      <div className="px-3 py-1 text-xs text-gray-500">新建</div>
                      <button
                        onClick={() => handleCreate('document')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                      >
                        <FileText className="w-4 h-4 text-blue-400" />
                        Markdown 文档
                      </button>
                      <button
                        onClick={() => handleCreate('whiteboard')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                      >
                        <LayoutGrid className="w-4 h-4 text-purple-400" />
                        画板
                      </button>
                      <button
                        onClick={() => handleCreate('spreadsheet')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                      >
                        <Table2 className="w-4 h-4 text-green-400" />
                        表格
                      </button>
                      <button
                        onClick={() => handleCreate('note')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                      >
                        <StickyNote className="w-4 h-4 text-yellow-400" />
                        小记
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            {/* 删除按钮 */}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-red-400 transition-colors"
                title="删除文件夹"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* 拖放提示 */}
        {isReceiving && (
          <span className="text-xs text-blue-400 animate-pulse">
            📥
          </span>
        )}
      </div>

      {/* 文件夹内容 */}
      {isExpanded && (
        <div className={cn(
          "transition-all duration-200",
          isReceiving && "pl-1 border-l-2 border-blue-500/30"
        )}>
          {children}
        </div>
      )}
    </div>
  )
}

// 未分类区域（作为根级放置目标）
interface UngroupedSectionProps {
  docs: Array<{
    id: string
    title: string
    type: 'document' | 'spreadsheet' | 'whiteboard' | 'note'
    position?: number
  }>
  onDelete: (docId: string) => void
  onNavigate: (docId: string) => void
  activeDocId?: string
  children?: React.ReactNode
}

export function UngroupedSection({
  docs,
  onDelete,
  onNavigate,
  activeDocId,
  children,
}: UngroupedSectionProps) {
  // 未分类区域作为放置目标
  const { setNodeRef, isOver, active } = useDroppable({
    id: 'folder-ungrouped', // 使用固定ID
    data: {
      type: 'folder',
      folderId: '', // 空表示未分类/根级
      isRoot: true,
    },
  })

  const isReceiving = isOver && active?.data.current?.type !== 'folder'

  if (docs.length === 0 && !children) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "mt-3 pt-3 border-t border-gray-800 min-h-[60px] rounded-lg transition-all duration-200",
          isOver && "bg-blue-500/10 ring-2 ring-blue-500/30"
        )}
      >
        <div className="px-2 py-1.5 text-xs font-medium text-gray-600 uppercase flex items-center justify-between">
          <span>未分类</span>
        </div>
        <div
          className={cn(
            "h-10 flex items-center justify-center text-xs rounded-lg mx-2",
            "border-2 border-dashed transition-all duration-200",
            isOver 
              ? 'border-blue-500 bg-blue-500/20 text-blue-300 scale-[1.02]' 
              : 'border-gray-700 text-gray-600'
          )}
        >
          {isOver ? (
            <span className="flex items-center gap-2">
              <span className="text-lg">📥</span>
              <span>释放以移动到未分类</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>📂</span>
              <span>拖放到未分类</span>
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "mt-3 pt-3 border-t border-gray-800 min-h-[60px] rounded-lg transition-all duration-200",
        isOver && "bg-blue-500/10 ring-2 ring-blue-500/30"
      )}
    >
      <div className="px-2 py-1.5 text-xs font-medium text-gray-600 uppercase flex items-center justify-between">
        <span className={cn(isReceiving && "text-blue-400")}>未分类</span>
        <div className="flex items-center gap-2">
          {docs.length > 0 && <span className="text-gray-500">{docs.length}</span>}
          {isReceiving && <span className="text-blue-400 animate-pulse">📥</span>}
        </div>
      </div>
      {children}
      {/* 底部放置区域 */}
      {isOver && (
        <div className="h-8 mt-1 mx-2 rounded-lg bg-blue-500/20 border-2 border-dashed border-blue-500/50 flex items-center justify-center text-xs text-blue-300 animate-pulse">
          <span className="flex items-center gap-2">
            <span>📥</span>
            <span>释放以添加到末尾</span>
          </span>
        </div>
      )}
    </div>
  )
}
