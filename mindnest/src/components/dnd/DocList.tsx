/**
 * 文档列表 - 支持拖拽排序和跨文件夹移动
 */
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, FileText, Table2, LayoutGrid, StickyNote } from 'lucide-react'
import { cn } from '../../utils/cn'
import type { DocumentType } from '../../stores/document'

interface Doc {
  id: string
  title: string
  type: DocumentType
  parentId?: string
  position?: number
}

interface DocListProps {
  docs: Doc[]
  folderId: string
  level?: number
  onDelete: (docId: string) => void
  onMove: (docId: string, targetFolderId: string, targetIndex: number) => void
  onNavigate: (docId: string) => void
  activeDocId?: string
}

// 文档类型配置
const typeConfig: Record<DocumentType, { icon: typeof FileText; color: string; bg: string }> = {
  document: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  spreadsheet: { icon: Table2, color: 'text-green-400', bg: 'bg-green-400/10' },
  whiteboard: { icon: LayoutGrid, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  note: { icon: StickyNote, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
}

// 可排序文档项
function SortableDocItem({
  doc,
  folderId,
  isActive,
  onDelete,
  onClick,
}: {
  doc: Doc
  folderId: string
  isActive: boolean
  onDelete: (id: string) => void
  onClick: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: doc.id,
    data: {
      type: 'document',
      id: doc.id,
      title: doc.title,
      docType: doc.type,
      folderId: folderId,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const config = typeConfig[doc.type]
  const Icon = config.icon

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer select-none",
        "transition-all duration-150",
        isActive ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-800",
        isDragging && "opacity-30 z-50 ring-2 ring-blue-500/50"
      )}
      onClick={onClick}
    >
      {/* 拖拽手柄 */}
      <div 
        className="p-0.5 text-gray-500 cursor-grab active:cursor-grabbing hover:text-gray-300"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3 h-3" />
      </div>

      {/* 文档图标 */}
      <div className={cn("p-1 rounded", config.bg)}>
        <Icon className={cn("w-3.5 h-3.5", config.color)} />
      </div>

      {/* 标题 */}
      <span className="flex-1 truncate">{doc.title || '无标题'}</span>

      {/* 删除按钮 */}
      <button
        className="p-1 rounded text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onDelete(doc.id) }}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}

export function DocList({
  docs,
  folderId,
  level = 0,
  onDelete,
  onNavigate,
  activeDocId,
}: DocListProps) {
  // 创建放置区域
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-${folderId}`,
    data: {
      type: 'folder',
      folderId: folderId,
    },
  })

  // 按 position 排序文档
  const sortedDocs = [...docs].sort((a, b) => (a.position || 0) - (b.position || 0))

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "rounded-lg transition-all duration-200 min-h-[20px] py-0.5",
        isOver && !activeDocId && "bg-blue-500/10 ring-2 ring-blue-500/30 ring-inset"
      )}
      style={{ marginLeft: `${level * 12}px` }}
    >
      {sortedDocs.length === 0 ? (
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
              <span>释放以移动到此处</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>📂</span>
              <span>空文件夹</span>
            </span>
          )}
        </div>
      ) : (
        <SortableContext
          items={sortedDocs.map(d => d.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-0.5 relative">
            {sortedDocs.map((doc, index) => (
              <div key={doc.id} className="relative">
                {/* 上方指示线 - 更明显的样式 */}
                <DropIndicator active={false} position="top" />
                
                <SortableDocItem
                  doc={doc}
                  folderId={folderId}
                  isActive={activeDocId === doc.id}
                  onDelete={onDelete}
                  onClick={() => onNavigate(doc.id)}
                />
                
                {/* 下方指示线（最后一个项目） */}
                {index === sortedDocs.length - 1 && (
                  <DropIndicator active={false} position="bottom" />
                )}
              </div>
            ))}
          </div>
          {/* 底部放置区域提示 */}
          {isOver && (
            <div className="h-8 mt-1 mx-2 rounded-lg bg-blue-500/20 border-2 border-dashed border-blue-500/50 flex items-center justify-center text-xs text-blue-300 animate-pulse">
              <span className="flex items-center gap-2">
                <span>📥</span>
                <span>释放以添加到末尾</span>
              </span>
            </div>
          )}
        </SortableContext>
      )}
    </div>
  )
}

// 放置指示线组件 - 增强视觉效果
function DropIndicator({ active, position }: { active: boolean; position: 'top' | 'bottom' }) {
  return (
    <div 
      className={cn(
        "absolute left-0 right-0 h-6 -z-10 pointer-events-none transition-all duration-150",
        position === 'top' ? '-top-1' : '-bottom-1'
      )}
    >
      {/* 背景高亮 */}
      <div 
        className={cn(
          "absolute inset-0 rounded transition-all duration-150",
          active ? "bg-blue-500/20" : "bg-transparent"
        )}
      />
      {/* 指示线 */}
      <div 
        className={cn(
          "absolute left-6 right-2 h-0.5 rounded-full transition-all duration-150",
          position === 'top' ? 'top-1/2 -translate-y-1/2' : 'top-1/2 -translate-y-1/2',
          active 
            ? "bg-blue-500 h-1 shadow-[0_0_8px_rgba(59,130,246,0.8)]" 
            : "bg-transparent h-0.5"
        )}
      >
        {active && (
          <>
            {/* 左侧圆点 */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
            {/* 右侧圆点 */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
          </>
        )}
      </div>
    </div>
  )
}
