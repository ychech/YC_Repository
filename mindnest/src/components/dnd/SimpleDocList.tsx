/**
 * 简化版可拖拽文档列表 - React DnD
 */
import { useCallback, useState } from 'react'
import { useDrop } from 'react-dnd'
import { SimpleDocItem, ItemTypes, type DragItem } from './SimpleDocItem'
import type { DocumentType } from '../../stores/document'

interface Doc {
  id: string
  title: string
  type: DocumentType
  parentId?: string
  position?: number
}

interface SimpleDocListProps {
  docs: Doc[]
  folderId: string
  level?: number
  onDelete: (docId: string) => void
  onMove: (docId: string, targetFolderId: string, targetIndex: number) => void
  onNavigate: (docId: string) => void
  activeDocId?: string
}

export function SimpleDocList({
  docs,
  folderId,
  level = 0,
  onDelete,
  onMove,
  onNavigate,
  activeDocId,
}: SimpleDocListProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  // 处理文档移动（同文件夹内排序或跨文件夹移动）
  const handleMove = useCallback((dragIndex: number, hoverIndex: number, dragFolderId: string) => {
    // 如果是跨文件夹拖拽
    if (dragFolderId !== folderId) {
      // 需要获取拖拽项的 ID，但这里只有 index
      // 实际跨文件夹移动通过底部的 drop 区域处理
      console.log('Cross-folder move from', dragFolderId, 'to', folderId)
      return
    }

    // 同文件夹内排序 - 这里只是视觉反馈，实际排序通过父组件的 onMove 处理
    console.log('Same folder move:', dragIndex, '->', hoverIndex)
    
    // 计算最终位置
    let finalIndex = hoverIndex
    if (dragIndex < hoverIndex) {
      finalIndex = hoverIndex - 1
    }
    
    // 获取拖拽的文档 ID
    const draggedDoc = docs[dragIndex]
    if (draggedDoc) {
      onMove(draggedDoc.id, folderId, finalIndex)
    }
  }, [docs, folderId, onMove])

  // 列表底部放置区域 - 用于跨文件夹拖拽
  const [{ isOver, canDrop }, drop] = useDrop<DragItem, unknown, { isOver: boolean; canDrop: boolean }>({
    accept: ItemTypes.DOCUMENT,
    canDrop: (item) => item.folderId !== folderId,
    drop: (item) => {
      onMove(item.id, folderId, docs.length)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  })

  // 空文件夹显示
  if (docs.length === 0) {
    return (
      <div
        ref={drop}
        className={`
          h-8 flex items-center justify-center text-xs rounded mx-2
          border border-dashed transition-colors duration-200
          ${isOver && canDrop 
            ? 'border-gray-500 bg-gray-800/50 text-gray-300' 
            : 'border-gray-700 text-gray-600'}
        `}
        style={{ marginLeft: `${level * 12 + 12}px` }}
      >
        {isOver && canDrop ? '释放以移动' : '空文件夹'}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {docs.map((doc, index) => (
        <SimpleDocItem
          key={doc.id}
          id={doc.id}
          title={doc.title}
          type={doc.type}
          index={index}
          folderId={folderId}
          level={level}
          isActive={activeDocId === doc.id}
          onDelete={onDelete}
          onClick={() => onNavigate(doc.id)}
          onMove={handleMove}
        />
      ))}
      
      {/* 底部放置区域（用于跨文件夹拖拽） */}
      <div
        ref={drop}
        className={`
          h-4 rounded transition-colors duration-200
          ${isOver && canDrop ? 'bg-gray-800/30 ring-1 ring-gray-600' : ''}
        `}
        style={{ marginLeft: `${level * 12 + 12}px` }}
      />
    </div>
  )
}

export { ItemTypes }
export type { DragItem }
