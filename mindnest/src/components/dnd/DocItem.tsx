/**
 * 可拖拽文档项 - 支持排序
 */
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, FileText, Table2, LayoutGrid, StickyNote } from 'lucide-react'
import { cn } from '../../utils/cn'
import type { DocumentType } from '../../stores/document'

interface DocItemProps {
  id: string
  title: string
  type: DocumentType
  folderId: string
  level: number
  isActive: boolean
  isDragging?: boolean
  isOverlay?: boolean
  isSorting?: boolean
  onDelete: (id: string) => void
  onClick: () => void
}

// 文档类型图标
const typeIcons: Record<DocumentType, typeof FileText> = {
  document: FileText,
  spreadsheet: Table2,
  whiteboard: LayoutGrid,
  note: StickyNote,
}

const typeColors: Record<DocumentType, string> = {
  document: 'text-blue-400',
  spreadsheet: 'text-green-400',
  whiteboard: 'text-purple-400',
  note: 'text-yellow-400',
}

const typeBgColors: Record<DocumentType, string> = {
  document: 'bg-blue-400/10',
  spreadsheet: 'bg-green-400/10',
  whiteboard: 'bg-purple-400/10',
  note: 'bg-yellow-400/10',
}

export function DocItem({
  id,
  title,
  type,
  level,
  isActive,
  isDragging,
  isOverlay,
  onDelete,
  onClick,
}: DocItemProps) {
  const Icon = typeIcons[type]
  const colorClass = typeColors[type]
  const bgColorClass = typeBgColors[type]

  return (
    <div
      className={cn(
        "relative group flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer select-none",
        "transition-all duration-150",
        isActive ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-800",
        isDragging && !isOverlay && "opacity-30",
        isOverlay && "bg-gray-700 text-white shadow-2xl ring-2 ring-blue-500 scale-105 z-50"
      )}
      style={{ marginLeft: `${level * 12}px` }}
      onClick={onClick}
    >
      {/* 拖拽手柄 */}
      <div 
        className="p-0.5 text-gray-500 cursor-grab active:cursor-grabbing hover:text-gray-300"
        data-drag-handle
      >
        <GripVertical className="w-3 h-3" />
      </div>

      {/* 文档图标 */}
      <div className={cn("p-1 rounded", bgColorClass)}>
        <Icon className={cn("w-3.5 h-3.5", colorClass)} />
      </div>

      {/* 标题 */}
      <span className="flex-1 truncate">{title || '无标题'}</span>

      {/* 删除按钮 */}
      <button
        className="p-1 rounded text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onDelete(id) }}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}

// 可拖拽包装器 - 用于跨文件夹拖拽
export function DraggableDocItem(props: DocItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.id,
    data: {
      type: 'document',
      id: props.id,
      folderId: props.folderId,
      title: props.title,
    },
  })

  const style = transform ? {
    transform: CSS.Transform.toString(transform),
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
    >
      <DocItem {...props} isDragging={isDragging} />
    </div>
  )
}

// 可排序包装器 - 用于文件夹内排序
interface SortableDocItemProps extends DocItemProps {
  index: number
}

export function SortableDocItem({ index, ...props }: SortableDocItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.id,
    data: {
      type: 'document',
      id: props.id,
      folderId: props.folderId,
      title: props.title,
      index,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <DocItem {...props} isDragging={isDragging} isSorting />
    </div>
  )
}

// 放置目标包装器 - 用于接收拖拽
interface DroppableFolderProps {
  folderId: string
  children: React.ReactNode
  isOver?: boolean
}

export function DroppableFolder({ folderId, children }: DroppableFolderProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-${folderId}`,
    data: {
      type: 'folder',
      folderId,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg transition-colors",
        isOver && "bg-blue-500/10 ring-2 ring-blue-500/30"
      )}
    >
      {children}
    </div>
  )
}

// 可排序文档列表
interface SortableDocListProps {
  docs: Array<{
    id: string
    title: string
    type: DocumentType
    parentId?: string
    position?: number
  }>
  folderId: string
  level?: number
  onDelete: (docId: string) => void
  onNavigate: (docId: string) => void
  activeDocId?: string
}

export function SortableDocList({
  docs,
  folderId,
  level = 0,
  onDelete,
  onNavigate,
  activeDocId,
}: SortableDocListProps) {
  return (
    <SortableContext
      items={docs.map(d => d.id)}
      strategy={verticalListSortingStrategy}
    >
      <div className="space-y-0.5">
        {docs.map((doc, index) => (
          <SortableDocItem
            key={doc.id}
            id={doc.id}
            title={doc.title}
            type={doc.type}
            folderId={folderId}
            level={level}
            isActive={activeDocId === doc.id}
            index={index}
            onDelete={onDelete}
            onClick={() => onNavigate(doc.id)}
          />
        ))}
      </div>
    </SortableContext>
  )
}
