// 简化版文档列表 - HTML5 拖拽实现
import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GripVertical, Trash2 } from 'lucide-react'
import { cn } from '../utils/cn'
import type { DocumentType } from '../stores/document'

export interface Doc {
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
  activeDocId?: string
  enableAutoScroll?: boolean
  onDocDragOver?: (isOver: boolean, pos: 'before' | 'after' | 'inside' | null) => void
}

// 全局拖拽状态
let gDocId: string | null = null
let gSourceFolder: string | null = null
let gDragStartTime: number = 0

export const dragState = { docId: null as string | null, sourceFolderId: null as string | null, isDragging: false }
export const resetDragState = () => { 
  dragState.docId = null; 
  dragState.sourceFolderId = null; 
  dragState.isDragging = false;
  gDocId = null;
  gSourceFolder = null;
}

export function SimpleDocList({ docs, folderId, level = 0, onDelete, onMove, activeDocId, onDocDragOver }: SimpleDocListProps) {
  const navigate = useNavigate()
  const [dragging, setDragging] = useState<string | null>(null)
  const [indicator, setIndicator] = useState<{idx: number, pos: 'before'|'after'} | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const clickPreventRef = useRef(false)

  // 处理文档点击（防止拖拽后立即触发点击）
  const handleDocClick = (docId: string) => {
    if (clickPreventRef.current) {
      clickPreventRef.current = false
      return
    }
    navigate(`/doc/${docId}`)
  }

  // 空文件夹
  if (docs.length === 0) {
    return (
      <div
        ref={containerRef}
        className="h-8 flex items-center justify-center text-xs text-gray-600 border border-dashed border-gray-700 rounded mx-2 hover:border-gray-500 hover:bg-gray-800/30 transition-colors"
        onDragOver={e => { 
          e.preventDefault(); 
          e.stopPropagation();
          if (gDocId && gSourceFolder !== folderId) {
            e.dataTransfer.dropEffect = 'move';
          }
        }}
        onDragEnter={e => {
          e.preventDefault();
          if (gDocId && gSourceFolder !== folderId) {
            e.currentTarget.classList.add('border-gray-500', 'bg-gray-800/30');
          }
        }}
        onDragLeave={e => {
          e.currentTarget.classList.remove('border-gray-500', 'bg-gray-800/30');
        }}
        onDrop={e => {
          e.preventDefault()
          e.stopPropagation()
          e.currentTarget.classList.remove('border-gray-500', 'bg-gray-800/30');
          if (gDocId && gSourceFolder !== folderId) {
            console.log('Empty folder drop:', gDocId, 'to', folderId)
            onMove(gDocId, folderId, 0)
          }
          resetDragState()
          setDragging(null)
        }}
      >拖拽到此处</div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="space-y-0.5"
      onDragOver={e => {
        e.preventDefault()
        e.stopPropagation()
        if (!gDocId) return

        // 计算放置位置
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return

        const relY = e.clientY - rect.top
        const ratio = relY / rect.height

        if (ratio < 0.3) {
          onDocDragOver?.(true, 'before')
        } else if (ratio > 0.7) {
          onDocDragOver?.(true, 'after')
        } else {
          onDocDragOver?.(true, 'inside')
        }
      }}
      onDragLeave={e => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          onDocDragOver?.(false, null)
        }
      }}
      onDrop={e => {
        e.preventDefault()
        e.stopPropagation()
        if (!gDocId) return

        console.log('Container drop:', gDocId, 'to', folderId)
        onMove(gDocId, folderId, 0)
        resetDragState()
        setDragging(null)
        onDocDragOver?.(false, null)
      }}
    >
      {docs.map((doc, i) => (
        <div
          key={doc.id}
          data-doc-id={doc.id}
          draggable={true}
          onDragStart={e => {
            e.stopPropagation()
            console.log('DragStart:', doc.id)
            gDragStartTime = Date.now()
            gDocId = doc.id
            gSourceFolder = folderId
            dragState.docId = doc.id
            dragState.sourceFolderId = folderId
            dragState.isDragging = true
            setDragging(doc.id)
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', doc.id)
            // 设置拖拽图像
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 10, rect.height / 2);
          }}
          onDragEnd={e => {
            e.stopPropagation()
            console.log('DragEnd')
            // 标记刚完成拖拽，防止触发点击
            if (Date.now() - gDragStartTime > 200) {
              clickPreventRef.current = true
              setTimeout(() => { clickPreventRef.current = false }, 100)
            }
            resetDragState()
            setDragging(null)
            setIndicator(null)
          }}
          onDragOver={e => {
            e.preventDefault()
            e.stopPropagation()
            if (!gDocId || gDocId === doc.id) return

            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
            setIndicator({idx: i, pos})
            onDocDragOver?.(false, null)
          }}
          onDragEnter={e => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onDrop={e => {
            e.preventDefault()
            e.stopPropagation()
            if (!gDocId || gDocId === doc.id) return

            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
            let idx = pos === 'before' ? i : i + 1

            if (gSourceFolder === folderId) {
              const dragIdx = docs.findIndex(d => d.id === gDocId)
              if (dragIdx < idx) idx--
            }

            console.log('Doc drop:', gDocId, 'to', folderId, 'at', idx)
            onMove(gDocId, folderId, idx)
            resetDragState()
            setDragging(null)
            setIndicator(null)
          }}
          className={cn(
            "relative flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer select-none",
            activeDocId === doc.id ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-800",
            dragging === doc.id && "opacity-50"
          )}
          style={{marginLeft: level * 12}}
          onClick={() => handleDocClick(doc.id)}
        >
          {/* 放置指示线 */}
          {indicator?.idx === i && indicator?.pos === 'before' && (
            <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)] z-20" />
          )}
          {indicator?.idx === i && indicator?.pos === 'after' && (
            <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)] z-20" />
          )}

          <div
            className="p-0.5 text-gray-500 cursor-grab"
            onMouseDown={e => e.stopPropagation()}
          >
            <GripVertical className="w-3 h-3" />
          </div>

          <span className="flex-1 truncate">{doc.title || '无标题'}</span>

          <span className="text-[10px] text-gray-500">
            {doc.type === 'document' ? '文档' :
             doc.type === 'whiteboard' ? '画板' :
             doc.type === 'spreadsheet' ? '表格' : '小记'}
          </span>

          <button
            className="p-1 text-gray-500 hover:text-red-400 opacity-0 hover:opacity-100 transition-opacity"
            onClick={e => {e.stopPropagation(); onDelete(doc.id)}}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
