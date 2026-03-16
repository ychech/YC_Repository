import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  FileText, Search, Settings, Plus, ChevronDown, ChevronRight,
  Share2, Table2, LayoutGrid, StickyNote,
  Database, FolderPlus, Loader2, GripVertical, Trash2
} from 'lucide-react'
import { cn } from '../utils/cn'
import { useDocumentStore, type DocumentType } from '../stores/document'
import { useKnowledgeBaseStore } from '../stores/knowledgeBase'

const typeIcons: Record<DocumentType, any> = {
  document: FileText, spreadsheet: Table2, whiteboard: LayoutGrid, note: StickyNote
}

const typeNames: Record<DocumentType, string> = {
  document: '文档', spreadsheet: '数据表', whiteboard: '画板', note: '小记'
}

const typeColors: Record<DocumentType, string> = {
  document: 'bg-blue-500/10 text-blue-500',
  spreadsheet: 'bg-green-500/10 text-green-500',
  whiteboard: 'bg-purple-500/10 text-purple-500',
  note: 'bg-orange-500/10 text-orange-500'
}

// 优化的文档项组件
const DocItem = memo(function DocItem({
  doc,
  isActive,
  isDragging,
  onDragStart,
  onDelete
}: {
  doc: { id: string; title: string; type: DocumentType }
  isActive: boolean
  isDragging: boolean
  onDragStart: (e: React.DragEvent, docId: string) => void
  onDelete?: (docId: string) => void
}) {
  const Icon = typeIcons[doc.type] || FileText
  const colorClass = typeColors[doc.type]
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, doc.id)}
      className={cn(
        "group flex items-center gap-1 py-1.5 pr-2 rounded-lg transition-colors cursor-pointer",
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
        isDragging && "opacity-50"
      )}
    >
      <GripVertical className="w-3 h-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0" />

      <Link
        to={`/doc/${doc.id}`}
        className="flex items-center gap-2 flex-1 min-w-0"
      >
        <div className={cn(
          "w-5 h-5 rounded flex items-center justify-center flex-shrink-0",
          isActive ? "bg-accent-foreground/10" : colorClass
        )}>
          <Icon className="w-3 h-3" />
        </div>
        <span className="truncate flex-1 text-sm">{doc.title || '无标题'}</span>
      </Link>

      {/* 更多操作菜单 */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent/80 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>

        {showMenu && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-32 bg-popover border border-border rounded-lg shadow-xl z-50 py-1">
              {onDelete && (
                <button
                  onClick={() => {
                    if (confirm(`确定要删除"${doc.title || '无标题'}"吗？`)) {
                      onDelete(doc.id)
                    }
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  删除
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
})

// 文件夹组件 - 独立的折叠状态管理
const FolderItem = memo(function FolderItem({
  folder,
  docs,
  isActive,
  isDragOver,
  draggingDocId,
  onToggle,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onCreateDoc,
  onDeleteFolder,
  onDeleteDoc
}: {
  folder: { id: string; name: string; icon?: string }
  docs: any[]
  isActive: boolean
  isDragOver: boolean
  draggingDocId: string | null
  onToggle: () => void
  onDragStart: (e: React.DragEvent, docId: string) => void
  onDragOver: (e: React.DragEvent, folderId: string) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, folderId: string) => void
  onCreateDoc: (folderId: string) => void
  onDeleteFolder: (folderId: string) => void
  onDeleteDoc?: (docId: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const location = useLocation()
  
  const handleToggle = () => {
    setIsExpanded(prev => !prev)
    onToggle()
  }

  return (
    <div>
      {/* 文件夹项 */}
      <div
        onDragOver={(e) => onDragOver(e, folder.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, folder.id)}
        className={cn(
          "rounded-lg transition-all",
          isDragOver && "bg-primary/10 ring-2 ring-primary/30 ring-inset"
        )}
      >
        <div className="flex items-center gap-1 py-1.5 pr-2 rounded-lg hover:bg-accent/50 group">
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-accent rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>

          <span className="text-base">{folder.icon || '📁'}</span>
          <span className="flex-1 text-sm truncate">{folder.name}</span>
          <span className="text-xs text-muted-foreground">({docs.length})</span>

          {/* 分组操作按钮 */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('[FolderItem] Plus button clicked, folder:', folder)
                setIsExpanded(true)
                if (folder.id) {
                  onCreateDoc(folder.id)
                } else {
                  console.error('[FolderItem] No folder id!')
                }
              }}
              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
              title="在此分组创建文档"
              type="button"
            >
              <Plus className="w-3.5 h-3.5 pointer-events-none" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteFolder(folder.id)
              }}
              className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive cursor-pointer"
              title="删除分组"
              type="button"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 分组内的文档 */}
      {isExpanded && docs.length > 0 && (
        <div className="ml-4 border-l border-border pl-2 space-y-0.5">
          {docs.map((doc) => (
            <DocItem
              key={doc.id}
              doc={doc}
              isActive={location.pathname === `/doc/${doc.id}`}
              isDragging={draggingDocId === doc.id}
              onDragStart={onDragStart}
              onDelete={onDeleteDoc}
            />
          ))}
        </div>
      )}
    </div>
  )
})

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    documents,
    createDocument,
    listDocuments,
    moveDocument,
    deleteDocument,
  } = useDocumentStore()
  const {
    knowledgeBases,
    currentKbId,
    folders,
    isLoading: kbLoading,
    loadKnowledgeBases,
    createKnowledgeBase,
    setCurrentKb,
    createFolder,
    deleteFolder
  } = useKnowledgeBaseStore()

  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const [showKbSelector, setShowKbSelector] = useState(false)
  const [showNewKbDialog, setShowNewKbDialog] = useState(false)
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newKbName, setNewKbName] = useState('')
  const [newFolderName, setNewFolderName] = useState('')

  // 拖拽状态
  const [draggingDocId, setDraggingDocId] = useState<string | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)

  // 初始化加载 - 从后端刷新数据（本地已有缓存）
  useEffect(() => {
    // 优先从本地缓存恢复，同时从后端刷新
    loadKnowledgeBases()
  }, [loadKnowledgeBases])

  // 加载当前知识库的文档 - 当 kbId 变化时总是重新加载
  useEffect(() => {
    if (currentKbId) {
      console.log('[Sidebar] Loading documents for KB:', currentKbId)
      listDocuments(currentKbId)
    }
  }, [currentKbId, listDocuments])

  // 当前知识库
  const currentKb = useMemo(() =>
    knowledgeBases.find(kb => kb.id === currentKbId),
    [knowledgeBases, currentKbId]
  )

  // 按知识库和父级分组文档 - 严格匹配
  const { folderDocs, ungroupedDocs } = useMemo(() => {
    const folderMap = new Map<string, any[]>()
    folders.forEach(f => folderMap.set(f.id, []))
    
    const ungrouped: any[] = []
    
    // 只处理当前知识库的文档
    const currentKbDocs = documents.filter(d => d.kbId === currentKbId)
    
    currentKbDocs.forEach(doc => {
      // parentId 可能是 undefined, null, 或空字符串都表示根级别
      if (!doc.parentId) {
        ungrouped.push(doc)
      } else {
        const group = folderMap.get(doc.parentId)
        if (group) {
          group.push(doc)
        } else {
          // parentId 对应的文件夹不存在，归入未分组
          ungrouped.push(doc)
        }
      }
    })
    
    return { folderDocs: folderMap, ungroupedDocs: ungrouped }
  }, [documents, folders, currentKbId])

  // 创建文档
  const handleCreateDocument = useCallback(async (type: DocumentType, parentId?: string) => {
    console.log('[Sidebar] handleCreateDocument called:', { type, parentId, currentKbId })
    setShowCreateMenu(false)

    let kbId = currentKbId
    if (!kbId) {
      console.log('[Sidebar] No current KB, finding or creating one...')
      if (knowledgeBases.length === 0) {
        const newKb = await createKnowledgeBase('默认知识库', '系统自动创建的知识库', '📚')
        if (newKb) kbId = newKb.id
      } else {
        kbId = knowledgeBases[0].id
        setCurrentKb(kbId)
      }
    }

    if (!kbId) {
      console.error('[Sidebar] No knowledge base available')
      alert('无法创建文档：没有可用的知识库')
      return
    }

    const defaultTitle = type === 'document' ? '无标题文档' :
                        type === 'spreadsheet' ? '无标题数据表' :
                        type === 'whiteboard' ? '无标题画板' : '小记'

    console.log('[Sidebar] Creating document:', { kbId, defaultTitle, parentId })
    
    try {
      const doc = await createDocument(kbId, defaultTitle, '', parentId)
      console.log('[Sidebar] Document created:', doc)
      if (doc) {
        navigate(`/doc/${doc.id}`)
      } else {
        alert('创建文档失败')
      }
    } catch (error) {
      console.error('[Sidebar] Failed to create document:', error)
      alert('创建文档失败: ' + String(error))
    }
  }, [currentKbId, knowledgeBases, createDocument, createKnowledgeBase, setCurrentKb, navigate])

  const handleCreateKb = useCallback(async () => {
    if (!newKbName.trim()) return
    await createKnowledgeBase(newKbName.trim())
    setNewKbName('')
    setShowNewKbDialog(false)
  }, [newKbName, createKnowledgeBase])

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim() || !currentKbId) return
    await createFolder(currentKbId, newFolderName.trim())
    setNewFolderName('')
    setShowNewFolderDialog(false)
  }, [newFolderName, currentKbId, createFolder])

  // 在文件夹中创建文档
  const handleCreateInFolder = (folderId: string) => {
    console.log('[Sidebar] handleCreateInFolder called:', folderId)
    // 直接调用 store 的 createDocument
    let kbId = currentKbId
    if (!kbId) {
      if (knowledgeBases.length > 0) {
        kbId = knowledgeBases[0].id
      }
    }
    if (!kbId) {
      alert('没有可用的知识库')
      return
    }
    
    console.log('[Sidebar] Directly calling createDocument:', { kbId, folderId })
    createDocument(kbId, '无标题文档', '', folderId)
      .then(doc => {
        console.log('[Sidebar] Document created successfully:', doc)
        if (doc) navigate(`/doc/${doc.id}`)
      })
      .catch(err => {
        console.error('[Sidebar] Failed to create document:', err)
        alert('创建失败: ' + String(err))
      })
  }

  // 删除文档
  const handleDeleteDocument = useCallback(async (docId: string) => {
    try {
      await deleteDocument(docId)
      // 如果当前正在查看被删除的文档，导航到首页
      if (location.pathname === `/doc/${docId}`) {
        navigate('/')
      }
    } catch (error) {
      console.error('[Sidebar] Failed to delete document:', error)
      alert('删除失败: ' + String(error))
    }
  }, [deleteDocument, location.pathname, navigate])

  // 拖拽处理
  const handleDragStart = useCallback((e: React.DragEvent, docId: string) => {
    setDraggingDocId(docId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify({ docId }))
  }, [])

  const handleDragOverFolder = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolderId(folderId)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.stopPropagation()
    setDragOverFolderId(null)
  }, [])

  const handleDropOnFolder = useCallback(async (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()

    setDragOverFolderId(null)

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      const docId = data.docId

      if (!docId || docId === folderId) {
        setDraggingDocId(null)
        return
      }

      console.log('[Sidebar] Moving document to folder:', { docId, folderId })
      await moveDocument(docId, currentKbId || undefined, undefined, folderId)
    } catch (error) {
      console.error('[Sidebar] Drop failed:', error)
    }

    setDraggingDocId(null)
  }, [currentKbId, moveDocument])

  const navItems = [
    { icon: Search, label: '搜索', path: '/search', shortcut: '⌘K' },
    { icon: Share2, label: '知识图谱', path: '/graph', shortcut: '' },
  ]

  const currentPath = location.pathname

  return (
    <aside className="w-64 h-full border-r border-border flex flex-col bg-sidebar">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">M</span>
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-sm">MindNest</h1>
            <p className="text-xs text-muted-foreground">个人知识库</p>
          </div>
        </div>

        {/* 知识库选择器 */}
        <div className="relative mb-3">
          <button
            onClick={() => setShowKbSelector(!showKbSelector)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm transition-colors"
          >
            <Database className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 truncate text-left">
              {kbLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  加载中...
                </span>
              ) : currentKb ? (
                <span className="flex items-center gap-2">
                  <span>{currentKb.icon || '📚'}</span>
                  {currentKb.name}
                </span>
              ) : (
                '选择知识库'
              )}
            </span>
            <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", showKbSelector && "rotate-180")} />
          </button>

          {showKbSelector && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowKbSelector(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
                {knowledgeBases.map((kb) => (
                  <button
                    key={kb.id}
                    onClick={() => {
                      setCurrentKb(kb.id)
                      setShowKbSelector(false)
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors",
                      currentKbId === kb.id && "bg-accent"
                    )}
                  >
                    <span className="text-lg">{kb.icon || '📚'}</span>
                    <span className="flex-1 text-sm">{kb.name}</span>
                    {currentKbId === kb.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </button>
                ))}
                <div className="border-t border-border">
                  <button
                    onClick={() => {
                      setShowKbSelector(false)
                      setShowNewKbDialog(true)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors text-muted-foreground"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">新建知识库</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 创建按钮 */}
        <div className="relative">
          <button
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建
            <ChevronDown className={cn("w-3 h-3 ml-auto transition-transform", showCreateMenu && "rotate-180")} />
          </button>

          {showCreateMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
                {(Object.keys(typeNames) as DocumentType[]).map((type) => {
                  const Icon = typeIcons[type]
                  return (
                    <button
                      key={type}
                      onClick={() => handleCreateDocument(type)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", typeColors[type])}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{typeNames[type]}</div>
                      </div>
                    </button>
                  )
                })}
                <div className="border-t border-border">
                  <button
                    onClick={() => {
                      setShowCreateMenu(false)
                      setShowNewFolderDialog(true)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-yellow-500/10 text-yellow-500">
                      <FolderPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">新建分组</div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
              currentPath === item.path
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <item.icon className="w-4 h-4" />
            <span className="flex-1">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto p-2">
        {currentKb && (
          <div className="space-y-0.5">
            {/* 分组列表 */}
            {folders.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                docs={folderDocs.get(folder.id) || []}
                isActive={false}
                isDragOver={dragOverFolderId === folder.id}
                draggingDocId={draggingDocId}
                onToggle={() => {}}
                onDragStart={handleDragStart}
                onDragOver={handleDragOverFolder}
                onDragLeave={handleDragLeave}
                onDrop={handleDropOnFolder}
                onCreateDoc={handleCreateInFolder}
                onDeleteFolder={deleteFolder}
                onDeleteDoc={handleDeleteDocument}
              />
            ))}

            {/* 未分组的文档 */}
            {ungroupedDocs.map((doc) => (
              <DocItem
                key={doc.id}
                doc={doc}
                isActive={currentPath === `/doc/${doc.id}`}
                isDragging={draggingDocId === doc.id}
                onDragStart={handleDragStart}
                onDelete={handleDeleteDocument}
              />
            ))}
          </div>
        )}

        {currentKb && ungroupedDocs.length === 0 && folders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>还没有内容</p>
            <p className="mt-1">点击上方"新建"开始创建</p>
          </div>
        )}

        {!currentKb && !kbLoading && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>请选择一个知识库</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border">
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            currentPath === '/settings'
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
        >
          <Settings className="w-4 h-4" />
          设置
        </Link>
      </div>

      {/* Dialogs */}
      {showNewKbDialog && (
        <Dialog onClose={() => setShowNewKbDialog(false)}>
          <h3 className="text-lg font-semibold mb-4">新建知识库</h3>
          <input
            type="text"
            value={newKbName}
            onChange={(e) => setNewKbName(e.target.value)}
            placeholder="知识库名称"
            className="w-full px-3 py-2 bg-muted rounded-lg outline-none focus:ring-2 focus:ring-primary mb-4"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateKb()}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNewKbDialog(false)} className="px-4 py-2 text-sm hover:bg-accent rounded-lg">
              取消
            </button>
            <button onClick={handleCreateKb} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg">
              创建
            </button>
          </div>
        </Dialog>
      )}

      {showNewFolderDialog && (
        <Dialog onClose={() => setShowNewFolderDialog(false)}>
          <h3 className="text-lg font-semibold mb-4">新建分组</h3>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="分组名称"
            className="w-full px-3 py-2 bg-muted rounded-lg outline-none focus:ring-2 focus:ring-primary mb-4"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNewFolderDialog(false)} className="px-4 py-2 text-sm hover:bg-accent rounded-lg">
              取消
            </button>
            <button onClick={handleCreateFolder} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg">
              创建
            </button>
          </div>
        </Dialog>
      )}
    </aside>
  )
}

// 对话框组件
function Dialog({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-lg p-6 w-80" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  )
}
