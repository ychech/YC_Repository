import { useEffect, useState, useMemo, memo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { StableEditor } from '../components/editor/StableEditor'
import { SpreadsheetEditor } from '../components/editor/spreadsheet/SpreadsheetEditor'
import { WhiteboardEditor } from '../components/editor/whiteboard/WhiteboardEditor'
import { NoteEditor } from '../components/editor/note/NoteEditor'
import { AIAssistant } from '../components/AIAssistant'
import { useDocumentStore, type DocumentType } from '../stores/document'
import { useKnowledgeBaseStore } from '../stores/knowledgeBase'
import type { Document } from '../types/document'
import { cn } from '../utils/cn'
import {
  Sparkles, MoreHorizontal, Share2, Star, Clock, History, MessageSquare,
  ChevronLeft, Trash2, Copy, FileOutput, FileText, Table2, LayoutGrid, StickyNote,
  Check, Loader2, Users, Eye, Settings, ChevronDown, MoreVertical, Maximize2, Minimize2
} from 'lucide-react'

const typeIcons: Record<DocumentType, any> = {
  document: FileText, spreadsheet: Table2, whiteboard: LayoutGrid, note: StickyNote
}

const typeNames: Record<DocumentType, string> = {
  document: '文档', spreadsheet: '数据表', whiteboard: '画板', note: '小记'
}

const typeColors: Record<DocumentType, { bg: string; text: string; border: string }> = {
  document: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  spreadsheet: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  whiteboard: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  note: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' }
}

// 语雀风格顶部栏
function EditorHeader({
  title, setTitle, docType, isStarred, setIsStarred, lastSaved,
  onBack, onShare, onToggleSidebar, showSidebar, isFullscreen, onToggleFullscreen
}: {
  title: string; setTitle: (t: string) => void; docType: DocumentType; isStarred: boolean;
  setIsStarred: (v: boolean) => void; lastSaved: Date | null; onBack: () => void;
  onShare: () => void; onToggleSidebar: () => void;
  showSidebar: boolean; isFullscreen: boolean; onToggleFullscreen: () => void;
}) {
  const TypeIcon = typeIcons[docType]
  const colors = typeColors[docType]

  const formatSavedTime = () => {
    if (!lastSaved) return '未保存'
    const diff = Date.now() - new Date(lastSaved).getTime()
    if (diff < 60000) return '已保存'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    return new Date(lastSaved).toLocaleTimeString()
  }

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur sticky top-0 z-50">
      {/* 左侧 */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button onClick={onBack} className="p-2 hover:bg-accent rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="h-5 w-px bg-border" />
        
        {/* 类型标签 */}
        <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium", colors.bg, colors.text, colors.border)}>
          <TypeIcon className="w-3.5 h-3.5" />
          <span>{typeNames[docType]}</span>
        </div>

        {/* 标题 - 简化显示 */}
        <span className="text-base font-medium truncate text-muted-foreground">
          {title || `无标题${typeNames[docType]}`}
        </span>

        {/* 保存状态 */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
          {lastSaved ? (
            <><Check className="w-3.5 h-3.5 text-green-500" /><span>{formatSavedTime()}</span></>
          ) : (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>保存中...</span></>
          )}
        </div>
      </div>

      {/* 右侧操作 */}
      <div className="flex items-center gap-0.5">
        <button onClick={() => setIsStarred(!isStarred)} className={cn("p-2 rounded-lg transition-colors", isStarred ? "text-amber-500 bg-amber-50" : "text-muted-foreground hover:bg-accent")}>
          <Star className={cn("w-4 h-4", isStarred && "fill-current")} />
        </button>
        
        <button className="hidden sm:flex p-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors">
          <History className="w-4 h-4" />
        </button>
        
        <div className="h-5 w-px bg-border mx-1" />

        <button className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-muted-foreground hover:bg-accent rounded-lg transition-colors text-sm">
          <Users className="w-4 h-4" />
          <span>协作</span>
        </button>



        <button onClick={onShare} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/80 text-accent-foreground rounded-lg transition-colors text-sm font-medium">
          <Share2 className="w-3.5 h-3.5" />
          <span>分享</span>
        </button>

        <button onClick={onToggleFullscreen} className="p-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors">
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <button onClick={onToggleSidebar} className={cn("p-2 rounded-lg transition-colors", showSidebar ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent")}>
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}

// 右侧信息面板
import { BacklinksPanel } from '../components/BacklinksPanel'

function RightSidebar({ document, onDelete, onDuplicate, onExport, docId }: {
  document: Document | null; onDelete: () => void; onDuplicate: () => void; onExport: () => void; docId: string
}) {
  if (!document) return null
  const colors = typeColors[document.type]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className="w-72 border-l border-border bg-card/30 overflow-y-auto"
    >
      <div className="p-4 space-y-6">
        {/* 文档信息卡片 */}
        <div className={cn("p-4 rounded-xl border", colors.bg, colors.border)}>
          <div className="flex items-center gap-3 mb-4">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-white", colors.text)}>
              {(() => { const Icon = typeIcons[document.type]; return <Icon className="w-5 h-5" /> })()}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{typeNames[document.type]}</p>
              <p className="font-medium text-sm truncate">{document.title || '无标题'}</p>
            </div>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">创建于</span><span>{new Date(document.createdAt).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">更新于</span><span>{new Date(document.updatedAt).toLocaleString()}</span></div>
          </div>
        </div>

        {/* 属性 */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />属性
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>阅读权限</span>
              <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs">
                <Eye className="w-3.5 h-3.5" />私有<ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span>评论权限</span>
              <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs">
                <MessageSquare className="w-3.5 h-3.5" />开启<ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* 操作 */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">操作</h3>
          <div className="space-y-1">
            <button onClick={onDuplicate} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors">
              <Copy className="w-4 h-4" />创建副本
            </button>
            <button onClick={onExport} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors">
              <FileOutput className="w-4 h-4" />导出文档
            </button>
            <button onClick={onDelete} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-red-50 text-red-600 transition-colors">
              <Trash2 className="w-4 h-4" />删除文档
            </button>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* 反向链接 */}
        <BacklinksPanel currentDocId={docId} />
      </div>
    </motion.div>
  )
}

export function EditorPage() {
  const { docId } = useParams<{ docId: string }>()
  const navigate = useNavigate()
  const {
    documents, currentDocument, createDocument, loadDocument, 
    loadDocumentContent, updateDocument, deleteDocument,
    updateSpreadsheetData, updateWhiteboardData, updateNoteData
  } = useDocumentStore()
  const { currentKbId, knowledgeBases, createKnowledgeBase, setCurrentKb } = useKnowledgeBaseStore()

  const [title, setTitle] = useState('')
  const [isStarred, setIsStarred] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 确保有知识库可用
  const ensureKbId = async (): Promise<string | null> => {
    if (currentKbId) return currentKbId
    if (knowledgeBases.length > 0) {
      setCurrentKb(knowledgeBases[0].id)
      return knowledgeBases[0].id
    }
    // 创建默认知识库
    const newKb = await createKnowledgeBase('默认知识库', '系统自动创建的知识库', '📚')
    return newKb?.id || null
  }

  useEffect(() => {
    const loadDoc = async () => {
      setError(null)
      
      if (docId === 'new') {
        const type = (new URLSearchParams(window.location.search).get('type') as DocumentType) || 'document'
        const defaultTitle = type === 'document' ? '无标题文档' : 
                            type === 'spreadsheet' ? '无标题数据表' :
                            type === 'whiteboard' ? '无标题画板' : '小记'
        
        const kbId = await ensureKbId()
        if (!kbId) {
          setError('无法创建知识库')
          return
        }
        
        setIsLoading(true)
        try {
          const doc = await createDocument(kbId, defaultTitle, '')
          if (doc) {
            navigate(`/doc/${doc.id}`, { replace: true })
          } else {
            setError('创建文档失败')
          }
        } catch (err) {
          setError(String(err))
        } finally {
          setIsLoading(false)
        }
      } else if (docId) {
        setIsLoading(true)
        try {
          // 先检查本地缓存
          const existingDoc = documents.find(d => d.id === docId)
          if (existingDoc && existingDoc.content !== undefined) {
            setTitle(existingDoc.title)
            setIsStarred(existingDoc.isFavorite || false)
            setLastSaved(existingDoc.updatedAt)
          } else {
            // 从后端加载
            const doc = await loadDocument(docId)
            if (doc) {
              setTitle(doc.title)
              setIsStarred(doc.isFavorite || false)
              setLastSaved(doc.updatedAt)
              // 加载内容
              await loadDocumentContent(docId)
            } else {
              setError('文档不存在或已被删除')
            }
          }
        } catch (err) {
          console.error('Failed to load document:', err)
          setError(String(err))
        } finally {
          setIsLoading(false)
        }
      }
    }
    
    loadDoc()
  }, [docId])

  // 同步 currentDocument 到本地状态
  useEffect(() => {
    if (currentDocument && docId === currentDocument.id) {
      setTitle(currentDocument.title)
      setIsStarred(currentDocument.isFavorite || false)
      setLastSaved(currentDocument.updatedAt)
    }
  }, [currentDocument, docId])

  // 处理标题变化（从编辑器同步）
  const handleTitleChange = useCallback(async (newTitle: string) => {
    setTitle(newTitle)
    if (!docId || docId === 'new' || !currentDocument) return
    if (newTitle !== currentDocument.title) {
      await updateDocument(docId, { title: newTitle })
      setLastSaved(new Date())
    }
  }, [docId, currentDocument?.id, updateDocument])

  // 自动保存内容
  const handleContentChange = async (content: string) => {
    if (!docId || docId === 'new') return
    await updateDocument(docId, { content })
    setLastSaved(new Date())
  }

  const handleDataChange = (data: any) => {
    if (!docId || docId === 'new' || !currentDocument) return
    switch (currentDocument.type) {
      case 'spreadsheet': updateSpreadsheetData(docId, data); break
      case 'whiteboard': updateWhiteboardData(docId, data); break
      case 'note': updateNoteData(docId, data); break
    }
    setLastSaved(new Date())
  }

  const handleDelete = async () => {
    if (!docId || docId === 'new') return
    if (confirm('确定要删除这篇文档吗？此操作不可撤销。')) {
      await deleteDocument(docId)
      navigate('/')
    }
  }

  const handleDuplicate = async () => {
    if (!currentDocument) return
    const kbId = await ensureKbId()
    if (!kbId) return
    
    const doc = await createDocument(
      kbId, 
      `${currentDocument.title} (副本)`, 
      currentDocument.content
    )
    if (doc) {
      navigate(`/doc/${doc.id}`)
    }
  }

  const renderEditor = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      )
    }
    
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="text-red-500 text-4xl">⚠️</div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button 
            onClick={() => navigate('/')} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
          >
            返回首页
          </button>
        </div>
      )
    }
    
    if (!currentDocument) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="text-4xl">📝</div>
          <p className="text-sm text-muted-foreground">选择一个文档开始编辑</p>
          <button 
            onClick={() => navigate('/')} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
          >
            返回首页
          </button>
        </div>
      )
    }
    
    switch (currentDocument.type) {
      case 'document': return (
        <StableEditor 
          content={currentDocument.content || ''} 
          onChange={handleContentChange}
          title={title}
          onTitleChange={handleTitleChange}
        />
      )
      case 'spreadsheet': return <SpreadsheetEditor data={currentDocument.data || { columns: [], rows: [], views: [] }} onChange={handleDataChange} />
      case 'whiteboard': return <WhiteboardEditor data={currentDocument.data || { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }} onChange={handleDataChange} />
      case 'note': return <NoteEditor data={currentDocument.data || { content: '', images: [], tags: [] }} onChange={handleDataChange} />
      default: return null
    }
  }

  return (
    <div className={cn("flex flex-col bg-background", isFullscreen && "fixed inset-0 z-50")}>
      <EditorHeader
        title={title} setTitle={setTitle} docType={currentDocument?.type || 'document'}
        isStarred={isStarred} setIsStarred={setIsStarred} lastSaved={lastSaved}
        onBack={() => navigate('/')} onShare={() => {}}
        onToggleSidebar={() => setShowSidebar(!showSidebar)} showSidebar={showSidebar}
        isFullscreen={isFullscreen} onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 min-w-0">{renderEditor()}</div>
        <AnimatePresence>
          {showSidebar && <RightSidebar document={currentDocument} docId={docId || ''} onDelete={handleDelete} onDuplicate={handleDuplicate} onExport={() => alert('导出功能开发中')} />}
        </AnimatePresence>
      </div>

      {/* AI 助手 */}
      {currentDocument?.type === 'document' && !error && (
        <AIAssistant
          documentContent={currentDocument.content}
          documentId={currentDocument.id}
          onInsertText={(text) => {
            const newContent = currentDocument.content 
              ? currentDocument.content + '\n\n' + text
              : text
            handleContentChange(newContent)
          }}
          onReplaceText={(text) => {
            handleContentChange(text)
          }}
        />
      )}
    </div>
  )
}
