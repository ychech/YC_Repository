/**
 * 企业级侧边栏组件 - 支持文档和文件夹拖拽排序
 * 
 * 功能特性：
 * - 文件夹树形展示（无限层级）
 * - 文档在文件夹内拖拽排序
 * - 文档跨文件夹拖拽
 * - 文件夹拖拽排序（同层级）
 * - 文件夹拖拽改变父级（移动到另一个文件夹下）
 * - 自动展开（拖拽悬停时自动展开文件夹）
 * - 黑灰主题设计
 * 
 * @author AI3
 * @see docs/AI3_DRAG_DROP_UPDATE.md
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  FileText, Search, Settings, Plus, ChevronDown, ChevronRight,
  Table2, LayoutGrid, StickyNote, Folder, FolderOpen,
  FolderPlus, Trash2, MoreHorizontal,
  PanelLeftClose, PanelLeft, Library, Box, GripVertical
} from 'lucide-react'
import { ask } from '@tauri-apps/plugin-dialog'
import { cn } from '../utils/cn'
import { useDocumentStore, type DocumentType } from '../stores/document'
import { useKnowledgeBaseStore } from '../stores/knowledgeBase'
import { SimpleDocList, dragState, resetDragState, type Doc } from './SimpleDocList'
import {
  DOCUMENT_TYPE_NAMES,
  DOCUMENT_TYPE_LUCIDE_ICONS,
  DRAG_CONFIG,
  FOLDER_DRAG_CONFIG,
  APP_CONFIG,
  ANIMATION_CONFIG,
  THEME_CONFIG,
  DOCUMENT_LIST_CONFIG,
  KB_CONFIG,
} from '../constants'

// ============================================================================
// 类型定义
// ============================================================================

/** 文件夹放置位置类型 */
type FolderDropPosition = 'before' | 'after' | 'inside' | null

/** 文件夹数据接口 */
interface Folder {
  id: string
  kbId: string
  parentId?: string
  name: string
  icon?: string
  position?: number
  createdAt?: Date
  updatedAt?: Date
}

/** 文件夹项 Props */
interface FolderItemProps {
  folder: Folder
  allFolders: Folder[]
  allDocs: Doc[]
  expandedFolders: Set<string>
  onToggle: (folderId: string) => void
  onShowCreateMenu: (anchor: HTMLElement, folderId: string) => void
  onDeleteFolder: (folderId: string) => void
  onDeleteDoc: (docId: string) => void
  onMoveDoc: (docId: string, targetFolderId: string, targetIndex: number) => void
  onMoveFolder: (folderId: string, targetParentId: string | null, targetIndex: number) => void
  level?: number
  isFirst?: boolean
  isLast?: boolean
  onDocDragOver?: (isOver: boolean, pos: 'before' | 'after' | 'inside' | null) => void
}

// ============================================================================
// 全局文件夹拖拽状态
// ============================================================================

interface FolderDragState {
  folderId: string | null
  sourceParentId: string | null
  isDragging: boolean
}

const folderDragState: FolderDragState = {
  folderId: null,
  sourceParentId: null,
  isDragging: false
}

function resetFolderDragState() {
  folderDragState.folderId = null
  folderDragState.sourceParentId = null
  folderDragState.isDragging = false
}

// ============================================================================
// 文件夹组件
// ============================================================================

function FolderItem({
  folder,
  allFolders,
  allDocs,
  expandedFolders,
  onToggle,
  onShowCreateMenu,
  onDeleteFolder,
  onDeleteDoc,
  onMoveDoc,
  onMoveFolder,
  level = 0,
  isFirst = false,
  isLast = false,
  onDocDragOver,
}: FolderItemProps) {
  const location = useLocation()
  const [showMenu, setShowMenu] = useState(false)
  const [dropPosition, setDropPosition] = useState<FolderDropPosition>(null)
  const [isExpanded, setIsExpanded] = useState(expandedFolders.has(folder.id))
  const [isFolderDragging, setIsFolderDragging] = useState(false)
  const [isDocDragOver, setIsDocDragOver] = useState(false)
  const autoExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const folderClickPreventRef = useRef(false)
  const folderDragStartTimeRef = useRef(0)
  
  // 子文件夹（排序后）
  const childFolders = useMemo(() => 
    allFolders
      .filter(f => f.parentId === folder.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0)),
    [allFolders, folder.id]
  )
  
  // 文件夹内的文档（排序后）
  const folderDocs = useMemo(() => 
    allDocs
      .filter(d => d.parentId === folder.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0)),
    [allDocs, folder.id]
  )

  // 同步展开状态
  useEffect(() => {
    setIsExpanded(expandedFolders.has(folder.id))
  }, [expandedFolders, folder.id])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoExpandTimerRef.current) {
        clearTimeout(autoExpandTimerRef.current)
      }
    }
  }, [])

  // SimpleDocList 的文档拖拽到文件夹内容区时的回调
  const handleDocDragOverFromList = (isOver: boolean, pos: 'before' | 'after' | 'inside' | null) => {
    if (isOver) {
      setIsDocDragOver(true)
      setDropPosition(pos)
    } else {
      setIsDocDragOver(false)
      setDropPosition(null)
    }
    onDocDragOver?.(isOver, pos)
  }

  // ============================================================================
  // 文件夹拖拽逻辑（文件夹排序）
  // ============================================================================

  const handleFolderDragStart = (e: React.DragEvent) => {
    folderDragState.folderId = folder.id
    folderDragState.sourceParentId = folder.parentId || null
    folderDragState.isDragging = true
    setIsFolderDragging(true)
    
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/folder-id', folder.id)
    
    // 自定义拖拽图像
    const el = e.currentTarget as HTMLElement
    if (el) {
      el.style.opacity = String(DRAG_CONFIG.DRAGGING_OPACITY)
    }
  }

  const handleFolderDragEnd = (e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement
    if (el) {
      el.style.opacity = ''
    }
    
    // 标记刚完成拖拽，防止触发点击
    if (Date.now() - folderDragStartTimeRef.current > 200) {
      folderClickPreventRef.current = true
      setTimeout(() => { folderClickPreventRef.current = false }, 100)
    }
    
    resetFolderDragState()
    setIsFolderDragging(false)
    setDropPosition(null)
  }

  // ============================================================================
  // 文件夹放置逻辑
  // ============================================================================

  const calculateFolderDropPosition = (e: React.DragEvent): FolderDropPosition => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    const ratio = relativeY / rect.height
    
    if (ratio < DRAG_CONFIG.FOLDER_BEFORE_THRESHOLD) return 'before'
    if (ratio > DRAG_CONFIG.FOLDER_AFTER_THRESHOLD) return 'after'
    return 'inside'
  }

  const handleFolderDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // 处理文档拖拽到文件夹
    if (dragState.isDragging && dragState.docId) {
      const pos = calculateFolderDropPosition(e)
      
      // 不能拖到源文件夹内部
      if (pos === 'inside' && dragState.sourceFolderId === folder.id) {
        setIsDocDragOver(false)
        return
      }
      
      setIsDocDragOver(true)
      setDropPosition(pos)
      
      // 自动展开计时器
      if (pos === 'inside' && !isExpanded) {
        if (!autoExpandTimerRef.current) {
          autoExpandTimerRef.current = setTimeout(() => {
            onToggle(folder.id)
          }, FOLDER_DRAG_CONFIG.AUTO_EXPAND_DELAY)
        }
      }
      return
    }

    // 处理文件夹拖拽（排序）
    if (folderDragState.isDragging && folderDragState.folderId && 
        folderDragState.folderId !== folder.id) {
      // 防止拖到自己子文件夹中
      const isChild = childFolders.some(f => f.id === folderDragState.folderId)
      if (!isChild) {
        const pos = calculateFolderDropPosition(e)
        setDropPosition(pos)
      }
    }
  }

  const handleFolderDragLeave = (e: React.DragEvent) => {
    // 检查是否真的离开了元素
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const { clientX, clientY } = e
    
    const isOutside = 
      clientX < rect.left || 
      clientX > rect.right || 
      clientY < rect.top || 
      clientY > rect.bottom
    
    if (isOutside) {
      setDropPosition(null)
      setIsDocDragOver(false)
      if (autoExpandTimerRef.current) {
        clearTimeout(autoExpandTimerRef.current)
        autoExpandTimerRef.current = null
      }
    }
  }

  const handleFolderDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const pos = dropPosition
    setDropPosition(null)
    setIsDocDragOver(false)
    
    if (autoExpandTimerRef.current) {
      clearTimeout(autoExpandTimerRef.current)
      autoExpandTimerRef.current = null
    }

    // 处理文档放置
    if (dragState.isDragging && dragState.docId) {
      handleDocDrop(pos)
      return
    }

    // 处理文件夹放置
    if (folderDragState.isDragging && folderDragState.folderId) {
      handleFolderMove(pos)
    }
  }

  // 文档放置处理
  const handleDocDrop = (pos: FolderDropPosition) => {
    if (!dragState.docId) return
    
    switch (pos) {
      case 'inside':
        if (dragState.sourceFolderId !== folder.id) {
          onMoveDoc(dragState.docId, folder.id, folderDocs.length)
          if (!isExpanded) {
            onToggle(folder.id)
          }
        }
        break
      case 'before':
        onMoveDoc(dragState.docId, folder.id, 0)
        break
      case 'after':
        onMoveDoc(dragState.docId, folder.id, folderDocs.length)
        break
    }
    
    resetDragState()
  }

  // 文件夹移动处理
  const handleFolderMove = (pos: FolderDropPosition) => {
    if (!folderDragState.folderId) return
    
    // 获取同层级的文件夹用于计算位置
    const siblingFolders = allFolders
      .filter(f => f.parentId === folder.parentId && f.id !== folderDragState.folderId)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
    
    const currentIndex = siblingFolders.findIndex(f => f.id === folder.id)
    let targetIndex: number
    let targetParentId: string | null = folder.parentId || null
    
    switch (pos) {
      case 'before':
        targetIndex = currentIndex
        break
      case 'after':
        targetIndex = currentIndex + 1
        break
      case 'inside':
        targetParentId = folder.id
        targetIndex = childFolders.length
        // 自动展开目标文件夹
        if (!isExpanded) {
          onToggle(folder.id)
        }
        break
      default:
        return
    }
    
    onMoveFolder(folderDragState.folderId, targetParentId, targetIndex)
    resetFolderDragState()
  }

  // 删除处理
  const handleDelete = async () => {
    const confirmed = await ask(`确定删除文件夹"${folder.name}"？`, {
      title: '确认删除', 
      kind: 'warning'
    })
    if (confirmed) onDeleteFolder(folder.id)
  }

  // 切换展开
  const handleToggle = () => {
    if (folderClickPreventRef.current) {
      return
    }
    onToggle(folder.id)
  }

  // ============================================================================
  // 渲染
  // ============================================================================

  return (
    <div className="select-none">
      {/* 上方指示线 */}
      {dropPosition === 'before' && (
        <div 
          className={cn(
            "rounded-full mx-2 my-1",
            DRAG_CONFIG.DROP_INDICATOR_COLOR,
            DRAG_CONFIG.DROP_INDICATOR_SHADOW
          )}
          style={{ height: `${DRAG_CONFIG.DROP_INDICATOR_HEIGHT}px` }}
        />
      )}
      
      {/* 文件夹头部 */}
      <div
        draggable
        onDragStart={handleFolderDragStart}
        onDragEnd={handleFolderDragEnd}
        onDragOver={handleFolderDragOver}
        onDragLeave={handleFolderDragLeave}
        onDrop={handleFolderDrop}
        className={cn(
          "group flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-all",
          "duration-150 ease-out",
          dropPosition === 'inside' || isDocDragOver
            ? DRAG_CONFIG.FOLDER_DROP_HIGHLIGHT
            : "hover:bg-gray-800",
          isFolderDragging && `opacity-[${DRAG_CONFIG.DRAGGING_OPACITY}]`
        )}
        style={{ 
          paddingLeft: `${FOLDER_DRAG_CONFIG.INDENT_BASE + level * FOLDER_DRAG_CONFIG.INDENT_PER_LEVEL}px`,
          transitionDuration: `${ANIMATION_CONFIG.FAST}ms`
        }}
      >
        {/* 展开/折叠按钮 */}
        <button 
          onClick={(e) => { e.stopPropagation(); handleToggle() }} 
          className="p-0.5 rounded hover:bg-gray-700 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
          )}
        </button>
        
        {/* 文件夹信息 */}
        <div 
          className="flex items-center gap-2 flex-1 min-w-0 select-none"
          onClick={handleToggle}
        >
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-gray-500 flex-shrink-0" />
          )}
          <span className="truncate font-medium text-gray-300">
            {folder.name}
          </span>
          <span className="text-xs text-gray-600">
            {folderDocs.length > 0 && folderDocs.length}
          </span>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            className="p-1 rounded hover:bg-gray-700 text-gray-400"
            onClick={(e) => { 
              e.stopPropagation()
              onShowCreateMenu(e.currentTarget, folder.id)
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
                    onClick={() => { handleDelete(); setShowMenu(false) }}
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
          {/* 子文件夹 */}
          {childFolders.map((childFolder, index) => (
            <FolderItem
              key={childFolder.id}
              folder={childFolder}
              allFolders={allFolders}
              allDocs={allDocs}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
              onShowCreateMenu={onShowCreateMenu}
              onDeleteFolder={onDeleteFolder}
              onDeleteDoc={onDeleteDoc}
              onMoveDoc={onMoveDoc}
              onMoveFolder={onMoveFolder}
              level={level + 1}
              isFirst={index === 0}
              isLast={index === childFolders.length - 1}
              onDocDragOver={onDocDragOver}
            />
          ))}
          
          {/* 文档列表 */}
          <SimpleDocList
            docs={folderDocs}
            folderId={folder.id}
            onDelete={onDeleteDoc}
            onMove={onMoveDoc}
            level={level + 1}
            activeDocId={location.pathname.split('/').pop()}
            enableAutoScroll
            onDocDragOver={handleDocDragOverFromList}
          />
          
          {/* 空文件夹提示 */}
          {folderDocs.length === 0 && childFolders.length === 0 && (
            <div 
              className="px-3 py-2 text-xs text-gray-600 italic"
              style={{ paddingLeft: `${20 + (level + 1) * FOLDER_DRAG_CONFIG.INDENT_PER_LEVEL}px` }}
            >
              {DOCUMENT_LIST_CONFIG.EMPTY_FOLDER_TEXT}
            </div>
          )}
        </div>
      )}
      
      {/* 下方指示线 */}
      {dropPosition === 'after' && (
        <div 
          className={cn(
            "rounded-full mx-2 my-1",
            DRAG_CONFIG.DROP_INDICATOR_COLOR,
            DRAG_CONFIG.DROP_INDICATOR_SHADOW
          )}
          style={{ height: `${DRAG_CONFIG.DROP_INDICATOR_HEIGHT}px` }}
        />
      )}
    </div>
  )
}

// ============================================================================
// 其他子组件
// ============================================================================

/** 新建菜单 */
function CreateMenu({ 
  open, onClose, anchor, onCreateDoc, onCreateFolder 
}: { 
  open: boolean
  onClose: () => void
  anchor: HTMLElement | null
  onCreateDoc: (type: DocumentType) => void
  onCreateFolder: () => void
}) {
  if (!open || !anchor) return null
  const rect = anchor.getBoundingClientRect()
  
  const docTypes: DocumentType[] = ['document', 'spreadsheet', 'whiteboard', 'note']
  
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div 
        className="fixed z-50 w-44 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1"
        style={{ top: rect.bottom + 4, left: rect.left }}
      >
        <div className="px-3 py-1 text-xs text-gray-500">新建文档</div>
        {docTypes.map(type => {
          const Icon = DOCUMENT_TYPE_LUCIDE_ICONS[type]
          return (
            <button
              key={type}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
              onClick={() => { onCreateDoc(type); onClose() }}
            >
              <Icon className="w-4 h-4 text-gray-400" />
              {DOCUMENT_TYPE_NAMES[type]}
            </button>
          )
        })}
        <div className="border-t border-gray-700 my-1" />
        <button
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
          onClick={() => { onCreateFolder(); onClose() }}
        >
          <FolderPlus className="w-4 h-4 text-gray-400" />
          新建文件夹
        </button>
      </div>
    </>
  )
}

/** 知识库选择器 */
function KnowledgeBaseSelector({
  knowledgeBases,
  currentKbId,
  onChange,
  onCreate,
}: {
  knowledgeBases: Array<{ id: string; name: string; icon?: string }>
  currentKbId: string | null
  onChange: (kbId: string) => void
  onCreate: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const currentKb = knowledgeBases.find(kb => kb.id === currentKbId)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        <Library className="w-4 h-4 text-gray-500" />
        <span className="flex-1 text-sm font-medium text-gray-300 truncate text-left">
          {currentKb?.name || '选择知识库'}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-auto">
            {knowledgeBases.map(kb => (
              <button
                key={kb.id}
                onClick={() => { onChange(kb.id); setIsOpen(false) }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                  currentKbId === kb.id
                    ? "bg-gray-800 text-gray-300"
                    : "text-gray-300 hover:bg-gray-800"
                )}
              >
                <span className="text-lg">{kb.icon || KB_CONFIG.DEFAULT_ICON}</span>
                <span className="flex-1 text-left truncate">{kb.name}</span>
                {currentKbId === kb.id && <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
              </button>
            ))}
            <div className="border-t border-gray-700 my-1" />
            <button
              onClick={() => { onCreate(); setIsOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              新建知识库
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// 主侧边栏组件
// ============================================================================

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  
  // 状态
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [createMenuAnchor, setCreateMenuAnchor] = useState<HTMLElement | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>()
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewKbDialog, setShowNewKbDialog] = useState(false)
  const [newKbName, setNewKbName] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  
  // Store
  const { documents, createDocument, loadAllDocuments, deleteDocument, setDocuments } = useDocumentStore()
  const { 
    knowledgeBases, currentKbId, folders, loadKnowledgeBases, createKnowledgeBase,
    setCurrentKb, createFolder, deleteFolder, loadFolders, updateFolder 
  } = useKnowledgeBaseStore()

  // 初始化
  useEffect(() => { loadKnowledgeBases() }, [])

  useEffect(() => {
    if (currentKbId) { 
      loadAllDocuments(currentKbId)
      loadFolders(currentKbId)
    }
  }, [currentKbId])

  // 计算属性
  const currentKb = useMemo(() =>
    knowledgeBases.find(kb => kb.id === currentKbId), 
    [knowledgeBases, currentKbId]
  )

  const { rootFolders, ungroupedDocs } = useMemo(() => {
    const root = folders
      .filter(f => !f.parentId)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
    
    const ungrouped: Doc[] = documents
      .filter(d => d.kbId === currentKbId && !d.parentId)
      .map(d => ({
        id: d.id,
        title: d.title,
        type: d.type,
        position: d.position
      }))
      .sort((a, b) => (a.position || 0) - (b.position || 0))
    
    return { rootFolders: root, ungroupedDocs: ungrouped }
  }, [documents, folders, currentKbId])

  // 事件处理
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  const handleCreateDocument = async (type: DocumentType) => {
    let kbId = currentKbId
    if (!kbId) {
      if (knowledgeBases.length === 0) {
        const newKb = await createKnowledgeBase(APP_CONFIG.DEFAULT_KB_ID, '', KB_CONFIG.DEFAULT_ICON)
        if (newKb) kbId = newKb.id
      } else {
        kbId = knowledgeBases[0].id
        setCurrentKb(kbId)
      }
    }
    if (!kbId) return
    
    const doc = await createDocument(
      kbId, 
      DOCUMENT_TYPE_NAMES[type], 
      '', 
      selectedFolderId, 
      type
    )
    
    if (doc) {
      navigate(`/doc/${doc.id}`)
      if (selectedFolderId) {
        setExpandedFolders(prev => new Set(prev).add(selectedFolderId))
      }
      setToast(`已创建${DOCUMENT_TYPE_NAMES[type]}`)
      setTimeout(() => setToast(null), APP_CONFIG.TOAST_DURATION)
    }
    setSelectedFolderId(undefined)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !currentKbId) return
    await createFolder(currentKbId, newFolderName.trim(), selectedFolderId)
    if (selectedFolderId) {
      setExpandedFolders(prev => new Set(prev).add(selectedFolderId))
    }
    setNewFolderName('')
    setSelectedFolderId(undefined)
    setShowNewFolderDialog(false)
    setToast('文件夹创建成功')
    setTimeout(() => setToast(null), APP_CONFIG.TOAST_DURATION)
  }

  const handleCreateKnowledgeBase = async () => {
    if (!newKbName.trim()) return
    const kb = await createKnowledgeBase(newKbName.trim(), '', KB_CONFIG.DEFAULT_ICON)
    if (kb) {
      setNewKbName('')
      setShowNewKbDialog(false)
      setToast('知识库创建成功')
      setTimeout(() => setToast(null), APP_CONFIG.TOAST_DURATION)
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    await deleteFolder(folderId)
    setExpandedFolders(prev => { 
      const next = new Set(prev)
      next.delete(folderId)
      return next 
    })
  }

  const handleDeleteDocument = async (docId: string) => {
    await deleteDocument(docId)
    if (location.pathname === `/doc/${docId}`) navigate('/')
  }

  // 移动文档（带位置计算）
  const handleMoveDoc = useCallback(async (
    docId: string, 
    targetFolderId: string, 
    targetIndex: number
  ) => {
    if (!currentKbId) return
    
    const doc = documents.find(d => d.id === docId)
    if (!doc) return
    
    // 获取目标文件夹中的文档（排除正在拖拽的）
    const targetDocs = documents
      .filter(d => d.parentId === targetFolderId && d.id !== docId)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
    
    // 计算新位置
    let newPosition: number
    if (targetDocs.length === 0) {
      newPosition = DRAG_CONFIG.POSITION_INCREMENT
    } else if (targetIndex <= 0) {
      newPosition = (targetDocs[0]?.position || DRAG_CONFIG.POSITION_INCREMENT) - DRAG_CONFIG.POSITION_INCREMENT
    } else if (targetIndex >= targetDocs.length) {
      newPosition = (targetDocs[targetDocs.length - 1]?.position || 0) + DRAG_CONFIG.POSITION_INCREMENT
    } else {
      newPosition = ((targetDocs[targetIndex - 1].position || 0) + (targetDocs[targetIndex].position || 0)) / 2
    }
    
    // 调用后端 API
    const { moveDocument } = useDocumentStore.getState()
    await moveDocument(docId, currentKbId, undefined, targetFolderId || null, newPosition)
    
    // 本地更新
    setDocuments(documents.map(d => 
      d.id === docId 
        ? { ...d, parentId: targetFolderId || undefined, position: newPosition } 
        : d
    ))
    
    setToast('移动成功')
    setTimeout(() => setToast(null), APP_CONFIG.CONFIRM_DURATION)
  }, [currentKbId, documents, setDocuments])

  // 移动文件夹（排序或改变父级）
  const handleMoveFolder = useCallback(async (
    folderId: string,
    targetParentId: string | null,
    targetIndex: number
  ) => {
    // 获取同层级的文件夹（排除正在拖拽的）
    const siblingFolders = folders
      .filter(f => f.parentId === targetParentId && f.id !== folderId)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
    
    // 计算新位置
    let newPosition: number
    if (siblingFolders.length === 0) {
      newPosition = DRAG_CONFIG.POSITION_INCREMENT
    } else if (targetIndex <= 0) {
      newPosition = (siblingFolders[0]?.position || DRAG_CONFIG.POSITION_INCREMENT) - DRAG_CONFIG.POSITION_INCREMENT
    } else if (targetIndex >= siblingFolders.length) {
      newPosition = (siblingFolders[siblingFolders.length - 1]?.position || 0) + DRAG_CONFIG.POSITION_INCREMENT
    } else {
      newPosition = ((siblingFolders[targetIndex - 1].position || 0) + (siblingFolders[targetIndex].position || 0)) / 2
    }
    
    // 调用后端更新
    await updateFolder(folderId, {
      parentId: targetParentId || undefined,
      position: newPosition,
    })
    
    setToast('文件夹移动成功')
    setTimeout(() => setToast(null), APP_CONFIG.CONFIRM_DURATION)
  }, [folders, updateFolder])

  const showCreateMenu = (anchor: HTMLElement, folderId?: string) => {
    setCreateMenuAnchor(anchor)
    setSelectedFolderId(folderId)
    setCreateMenuOpen(true)
  }

  // 文档拖拽到文件夹状态追踪
  const [docDragOverFolderId, setDocDragOverFolderId] = useState<string | null>(null)

  const handleDocDragOver = useCallback((folderId: string) => (isOver: boolean, pos: 'before' | 'after' | 'inside' | null) => {
    if (isOver) {
      setDocDragOverFolderId(folderId)
    } else {
      setDocDragOverFolderId(prev => prev === folderId ? null : prev)
    }
  }, [])

  // 折叠状态
  if (isCollapsed) {
    return (
      <aside className="w-12 h-full border-r border-gray-800 flex flex-col bg-black">
        <div className="p-2 border-b border-gray-800">
          <button 
            onClick={() => setIsCollapsed(false)} 
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800"
          >
            <PanelLeft className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-64 h-full border-r border-gray-800 flex flex-col bg-black">
      {/* 头部 */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center">
            <Box className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-semibold text-sm flex-1 truncate text-gray-200">
            {APP_CONFIG.NAME}
          </h1>
          <button 
            onClick={() => setIsCollapsed(true)} 
            className="p-1.5 rounded hover:bg-gray-800 text-gray-500"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        <KnowledgeBaseSelector
          knowledgeBases={knowledgeBases}
          currentKbId={currentKbId}
          onChange={setCurrentKb}
          onCreate={() => setShowNewKbDialog(true)}
        />
      </div>

      {/* 新建按钮 */}
      <div className="px-3 py-2 border-b border-gray-800">
        <button
          onClick={(e) => showCreateMenu(e.currentTarget)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建
          <ChevronDown className="w-3.5 h-3.5 ml-auto" />
        </button>
      </div>

      {/* 导航 */}
      <nav className="p-2">
        <Link to="/search" className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors">
          <Search className="w-4 h-4" />
          <span className="flex-1">搜索</span>
        </Link>
      </nav>

      {/* 文档树 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {currentKbId ? (
          <>
            {/* 文件夹列表 */}
            {rootFolders.map((folder, index) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                allFolders={folders}
                allDocs={documents.filter(d => d.kbId === currentKbId).map(d => ({
                  id: d.id,
                  title: d.title,
                  type: d.type,
                  position: d.position
                }))}
                expandedFolders={expandedFolders}
                onToggle={toggleFolder}
                onShowCreateMenu={showCreateMenu}
                onDeleteFolder={handleDeleteFolder}
                onDeleteDoc={handleDeleteDocument}
                onMoveDoc={handleMoveDoc}
                onMoveFolder={handleMoveFolder}
                isFirst={index === 0}
                isLast={index === rootFolders.length - 1}
                onDocDragOver={handleDocDragOver(folder.id)}
              />
            ))}

            {/* 未分组文档 */}
            {ungroupedDocs.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-800">
                <div className="px-2 py-1.5 text-xs font-medium text-gray-600 uppercase">
                  {DOCUMENT_LIST_CONFIG.UNGROUPED_TITLE}
                </div>
                <SimpleDocList
                  docs={ungroupedDocs}
                  folderId=""
                  onDelete={handleDeleteDocument}
                  onMove={handleMoveDoc}
                  activeDocId={location.pathname.split('/').pop()}
                  enableAutoScroll
                />
              </div>
            )}

            {rootFolders.length === 0 && ungroupedDocs.length === 0 && (
              <div className="text-center py-8 text-gray-600">
                <Folder className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">暂无内容</p>
                <p className="text-xs mt-1">点击"新建"开始</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-600">
            <Library className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">请选择知识库</p>
          </div>
        )}
      </div>

      {/* 底部 */}
      <div className="p-2 border-t border-gray-800">
        <Link to="/settings" className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors">
          <Settings className="w-4 h-4" />
          设置
        </Link>
      </div>

      {/* 新建菜单 */}
      <CreateMenu
        open={createMenuOpen}
        onClose={() => { setCreateMenuOpen(false); setSelectedFolderId(undefined) }}
        anchor={createMenuAnchor}
        onCreateDoc={handleCreateDocument}
        onCreateFolder={() => { setShowNewFolderDialog(true); setCreateMenuOpen(false) }}
      />

      {/* 新建文件夹对话框 */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-900 rounded-xl p-5 w-80 border border-gray-700">
            <h3 className="text-base font-semibold mb-2 text-gray-200">
              {selectedFolderId ? '新建子文件夹' : '新建文件夹'}
            </h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="文件夹名称"
              className="w-full px-3 py-2 bg-gray-800 border-0 rounded-lg text-sm text-gray-200 outline-none mb-4 focus:ring-2 focus:ring-gray-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => { setShowNewFolderDialog(false); setSelectedFolderId(undefined) }} 
                className="px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 rounded-lg"
              >取消</button>
              <button 
                onClick={handleCreateFolder} 
                className="px-4 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >创建</button>
            </div>
          </div>
        </div>
      )}

      {/* 新建知识库对话框 */}
      {showNewKbDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-900 rounded-xl p-5 w-80 border border-gray-700">
            <h3 className="text-base font-semibold mb-4 text-gray-200">
              新建知识库
            </h3>
            <input
              type="text"
              value={newKbName}
              onChange={(e) => setNewKbName(e.target.value)}
              placeholder="知识库名称"
              className="w-full px-3 py-2 bg-gray-800 border-0 rounded-lg text-sm text-gray-200 outline-none mb-4 focus:ring-2 focus:ring-gray-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateKnowledgeBase()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => { setShowNewKbDialog(false); setNewKbName('') }} 
                className="px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 rounded-lg"
              >取消</button>
              <button 
                onClick={handleCreateKnowledgeBase} 
                className="px-4 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-gray-800 text-gray-200 rounded-lg shadow-lg text-sm border border-gray-700">
          {toast}
        </div>
      )}
    </aside>
  )
}

// 导出类型
export type { Folder, FolderItemProps, FolderDropPosition }
