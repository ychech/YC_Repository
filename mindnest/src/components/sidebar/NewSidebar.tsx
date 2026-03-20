/**
 * 新版侧边栏 - 支持完整拖拽功能
 * - 文档在文件夹内排序
 * - 文档跨文件夹移动
 * - 文件夹之间排序
 * - 文件夹可以嵌套（拖拽到其他文件夹）
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  Plus, PanelLeftClose, PanelLeft, FileText, Table2, LayoutGrid, StickyNote, 
  FolderPlus, Check, Building2, Library
} from 'lucide-react'
import { DocList } from '../dnd/DocList'
import { SortableFolder, UngroupedSection } from '../dnd/SortableFolder'
import { useDocumentStore, type DocumentType } from '../../stores/document'
import { useKnowledgeBaseStore } from '../../stores/knowledgeBase'
import { LogoIcon } from '../ui/Logo'
import { cn } from '../../utils/cn'

// 递归渲染文件夹树
interface FolderTreeProps {
  folderId: string
  level: number
  folders: Array<{ id: string; name: string; parentId?: string; position?: number }>
  documents: Array<{ id: string; title: string; type: DocumentType; parentId?: string; position?: number }>
  expandedFolders: Set<string>
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onDeleteFolder: (id: string) => void
  onNavigate: (id: string) => void
  onCreateInFolder: (folderId: string, type: DocumentType) => void
  activeDocId?: string
}

function FolderTree({
  folderId,
  level,
  folders,
  documents,
  expandedFolders,
  onToggle,
  onDelete,
  onDeleteFolder,
  onNavigate,
  onCreateInFolder,
  activeDocId,
}: FolderTreeProps) {
  // 获取当前文件夹的子文件夹
  // 处理根级：folderId="" 匹配 parentId 为 undefined/null/"" 的文件夹
  const childFolders = folders
    .filter(f => {
      const fParentId = f.parentId || ''
      return fParentId === folderId
    })
    .sort((a, b) => (a.position || 0) - (b.position || 0))

  return (
    <>
      {childFolders.map(folder => {
        const folderDocs = documents.filter(d => (d.parentId || '') === folder.id)
        const isExpanded = expandedFolders.has(folder.id)
        
        return (
          <SortableFolder
            key={folder.id}
            id={folder.id}
            name={folder.name}
            isExpanded={isExpanded}
            docCount={folderDocs.length}
            level={level}
            onToggle={() => onToggle(folder.id)}
            onCreate={(type) => onCreateInFolder(folder.id, type)}
            onDelete={() => onDeleteFolder(folder.id)}
          >
            {isExpanded && (
              <>
                {/* 子文件夹 */}
                <FolderTree
                  folderId={folder.id}
                  level={level + 1}
                  folders={folders}
                  documents={documents}
                  expandedFolders={expandedFolders}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onDeleteFolder={onDeleteFolder}
                  onNavigate={onNavigate}
                  onCreateInFolder={onCreateInFolder}
                  activeDocId={activeDocId}
                />
                {/* 当前文件夹的文档 */}
                <DocList
                  docs={folderDocs}
                  folderId={folder.id}
                  level={level + 1}
                  onDelete={onDelete}
                  onMove={() => {}}
                  onNavigate={onNavigate}
                  activeDocId={activeDocId}
                />
              </>
            )}
          </SortableFolder>
        )
      })}
    </>
  )
}

export function NewSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  
  // 状态
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showKbSelector, setShowKbSelector] = useState(false)
  const [showCreateKbDialog, setShowCreateKbDialog] = useState(false)
  const [newKbName, setNewKbName] = useState('')
  const [newKbDesc, setNewKbDesc] = useState('')
  const kbSelectorRef = useRef<HTMLDivElement>(null)
  
  // Store
  const { documents, deleteDocument, createDocument } = useDocumentStore()
  const { knowledgeBases, currentKbId, folders, createFolder, deleteFolder, createKnowledgeBase, setCurrentKb, deleteKnowledgeBase } = useKnowledgeBaseStore()

  // 计算属性
  const currentKb = useMemo(() =>
    knowledgeBases.find(kb => kb.id === currentKbId),
    [knowledgeBases, currentKbId]
  )

  const { kbFolders, kbDocs, ungroupedDocs } = useMemo(() => {
    if (!currentKbId) {
      return { kbFolders: [], kbDocs: [], ungroupedDocs: [] }
    }
    
    const safeDocuments = documents || []
    const safeFolders = folders || []
    
    const docs = safeDocuments
      .filter(d => d && d.kbId === currentKbId)
      .map(d => ({
        id: d.id || '',
        title: d.title || 'Untitled',
        type: d.type || 'document',
        parentId: d.parentId,
        position: d.position
      }))
      .sort((a, b) => (a.position || 0) - (b.position || 0))
    
    return { 
      kbFolders: safeFolders.filter(f => f && f.kbId === currentKbId),
      kbDocs: docs,
      ungroupedDocs: docs.filter(d => !d.parentId)
    }
  }, [documents, folders, currentKbId])

  // 点击外部关闭知识库选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (kbSelectorRef.current && !kbSelectorRef.current.contains(event.target as Node)) {
        setShowKbSelector(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 事件处理
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  const handleDeleteDocument = async (docId: string) => {
    await deleteDocument(docId)
    if (location.pathname === `/doc/${docId}`) navigate('/')
  }

  // 创建文件夹
  const handleCreateFolder = async () => {
    console.log('[NewSidebar] handleCreateFolder 被调用', { newFolderName, currentKbId })
    
    if (!newFolderName.trim()) {
      console.log('[NewSidebar] 文件夹名称为空')
      setShowCreateFolderDialog(false)
      setNewFolderName('')
      return
    }
    
    if (!currentKbId) {
      console.log('[NewSidebar] 没有选择知识库')
      alert('请先选择一个知识库')
      setShowCreateFolderDialog(false)
      setNewFolderName('')
      return
    }

    try {
      console.log('[NewSidebar] 开始创建文件夹:', { currentKbId, name: newFolderName.trim() })
      const result = await createFolder(currentKbId, newFolderName.trim())
      console.log('[NewSidebar] 创建文件夹结果:', result)
      if (result) {
        setShowCreateFolderDialog(false)
        setNewFolderName('')
      } else {
        alert('创建文件夹失败，请重试')
      }
    } catch (error) {
      console.error('[NewSidebar] 创建文件夹失败:', error)
      alert(`创建文件夹失败: ${error}`)
    }
  }

  // 删除文件夹
  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('确定要删除此文件夹吗？文件夹内的文档将被移到未分类。')) {
      return
    }
    try {
      await deleteFolder(folderId)
    } catch (error) {
      console.error('[NewSidebar] 删除文件夹失败:', error)
      alert(`删除文件夹失败: ${error}`)
    }
  }

  // 创建知识库
  const handleCreateKb = async () => {
    if (!newKbName.trim()) {
      setShowCreateKbDialog(false)
      return
    }

    try {
      const kb = await createKnowledgeBase(newKbName.trim(), newKbDesc.trim() || undefined)
      if (kb) {
        setShowCreateKbDialog(false)
        setNewKbName('')
        setNewKbDesc('')
        setShowKbSelector(false)
      }
    } catch (error) {
      console.error('[NewSidebar] 创建知识库失败:', error)
      alert(`创建知识库失败: ${error}`)
    }
  }

  // 创建文档
  const handleCreateDocument = async (type: DocumentType, folderId?: string) => {
    try {
      let kbId = currentKbId
      
      if (!kbId) {
        if (knowledgeBases.length === 0) {
          const newKb = await createKnowledgeBase('我的知识库', '', '📚')
          if (newKb) kbId = newKb.id
        } else {
          kbId = knowledgeBases[0].id
          setCurrentKb(kbId)
        }
      }
      
      if (!kbId) return

      const typeNames: Record<DocumentType, string> = {
        document: '文档',
        whiteboard: '画板',
        spreadsheet: '表格',
        note: '小记',
      }

      const doc = await createDocument(
        kbId,
        `新建${typeNames[type]}`,
        '',
        folderId,
        type
      )

      if (doc) {
        navigate(`/doc/${doc.id}`)
      }
    } catch (error) {
      console.error('[NewSidebar] 创建文档失败:', error)
      alert(`创建失败: ${error}`)
    }
    
    setShowCreateMenu(false)
  }

  // 在指定文件夹中创建文档
  const handleCreateDocumentInFolder = async (folderId: string, type: DocumentType) => {
    await handleCreateDocument(type, folderId)
  }

  // 折叠状态
  if (isCollapsed) {
    return (
      <aside className="w-12 h-full border-r border-gray-800 flex flex-col bg-black">
        <div className="p-2 border-b border-gray-800">
          <div className="w-8 h-8 flex items-center justify-center">
            <LogoIcon size={24} />
          </div>
        </div>
        <div className="p-2">
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
          <div className="w-8 h-8 flex items-center justify-center">
            <LogoIcon size={28} />
          </div>
          <h1 className="font-semibold text-sm flex-1 truncate text-gray-200">
            MindNest
          </h1>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-500"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* 知识库选择器 */}
        <div className="relative" ref={kbSelectorRef}>
          <button
            onClick={() => setShowKbSelector(!showKbSelector)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors"
          >
            <Building2 className="w-4 h-4 text-gray-500" />
            <span className="flex-1 text-sm text-gray-300 truncate text-left">
              {currentKb?.name || '选择知识库'}
            </span>
            <svg 
              className={cn("w-3.5 h-3.5 text-gray-500 transition-transform", showKbSelector && "rotate-180")}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* 知识库下拉菜单 */}
          {showKbSelector && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
              <div className="px-3 py-1.5 text-xs text-gray-500 font-medium">
                选择知识库
              </div>
              {knowledgeBases.map(kb => (
                <button
                  key={kb.id}
                  onClick={() => {
                    setCurrentKb(kb.id)
                    setShowKbSelector(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-800 transition-colors",
                    kb.id === currentKbId ? 'text-blue-400 bg-blue-500/10' : 'text-gray-300'
                  )}
                >
                  <span className="text-base">{kb.icon || '📚'}</span>
                  <span className="flex-1 truncate text-left">{kb.name}</span>
                  {kb.id === currentKbId && <Check className="w-4 h-4" />}
                </button>
              ))}
              
              {knowledgeBases.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                  暂无知识库
                </div>
              )}
              
              <div className="border-t border-gray-700 my-1" />
              
              <button
                onClick={() => {
                  setShowKbSelector(false)
                  setShowCreateKbDialog(true)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>新建知识库</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 新建按钮 */}
      <div className="px-3 py-2 border-b border-gray-800 relative">
        <button
          onClick={() => setShowCreateMenu(!showCreateMenu)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          新建
        </button>
        
        {/* 创建菜单 */}
        {showCreateMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)} />
            <div className="absolute left-3 right-3 top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
              <div className="px-3 py-1 text-xs text-gray-500">新建文档</div>
              <button
                onClick={() => handleCreateDocument('document')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                Markdown 文档
              </button>
              <button
                onClick={() => handleCreateDocument('whiteboard')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                <LayoutGrid className="w-4 h-4 text-purple-400" />
                画板
              </button>
              <button
                onClick={() => handleCreateDocument('spreadsheet')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                <Table2 className="w-4 h-4 text-green-400" />
                表格
              </button>
              <button
                onClick={() => handleCreateDocument('note')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                <StickyNote className="w-4 h-4 text-yellow-400" />
                小记
              </button>
              <div className="border-t border-gray-700 my-1" />
              <button
                onClick={() => {
                  console.log('[NewSidebar] 点击文件夹菜单项')
                  setShowCreateMenu(false)
                  setShowCreateFolderDialog(true)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                <FolderPlus className="w-4 h-4 text-orange-400" />
                文件夹
              </button>
            </div>
          </>
        )}

        {/* 创建文件夹对话框 */}
        {showCreateFolderDialog && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowCreateFolderDialog(false)} />
            <div className="absolute left-3 right-3 top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 p-3">
              <div className="text-sm font-medium text-gray-300 mb-2">新建文件夹</div>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="文件夹名称"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder()
                  if (e.key === 'Escape') setShowCreateFolderDialog(false)
                }}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowCreateFolderDialog(false)}
                  className="flex-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    console.log('[NewSidebar] 点击创建按钮')
                    handleCreateFolder()
                  }}
                  className="flex-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                >
                  创建
                </button>
              </div>
            </div>
          </>
        )}

        {/* 创建知识库对话框 */}
        {showCreateKbDialog && (
          <>
            <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCreateKbDialog(false)} />
            <div className="absolute left-3 right-3 top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 p-4">
              <div className="text-sm font-medium text-gray-200 mb-3">新建知识库</div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">名称</label>
                  <input
                    type="text"
                    value={newKbName}
                    onChange={(e) => setNewKbName(e.target.value)}
                    placeholder="我的知识库"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">描述（可选）</label>
                  <input
                    type="text"
                    value={newKbDesc}
                    onChange={(e) => setNewKbDesc(e.target.value)}
                    placeholder="知识库描述"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowCreateKbDialog(false)}
                  className="flex-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateKb}
                  className="flex-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                >
                  创建
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 文档树 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {currentKbId && (
          <>
            {/* 文件夹树 - 从根级开始递归渲染 */}
            <FolderTree
              folderId="" // 空字符串表示根级
              level={0}
              folders={kbFolders}
              documents={kbDocs}
              expandedFolders={expandedFolders}
              onToggle={toggleFolder}
              onDelete={handleDeleteDocument}
              onDeleteFolder={handleDeleteFolder}
              onNavigate={(docId) => navigate(`/doc/${docId}`)}
              onCreateInFolder={handleCreateDocumentInFolder}
              activeDocId={location.pathname.split('/').pop()}
            />

            {/* 未分类区域 */}
            <UngroupedSection
              docs={ungroupedDocs}
              onDelete={handleDeleteDocument}
              onNavigate={(docId) => navigate(`/doc/${docId}`)}
              activeDocId={location.pathname.split('/').pop()}
            >
              <DocList
                docs={ungroupedDocs}
                folderId=""
                level={0}
                onDelete={handleDeleteDocument}
                onMove={() => {}}
                onNavigate={(docId) => navigate(`/doc/${docId}`)}
                activeDocId={location.pathname.split('/').pop()}
              />
            </UngroupedSection>
          </>
        )}
        
        {/* 无知识库状态 */}
        {!currentKbId && (
          <div className="mt-8 text-center px-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-800 flex items-center justify-center">
              <Library className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">还没有知识库</p>
            <button
              onClick={() => setShowCreateKbDialog(true)}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              创建知识库
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
