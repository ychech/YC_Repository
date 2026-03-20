import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Clock,
  Star,
  FileText,
  Table2,
  LayoutGrid,
  StickyNote,
  Plus,
  ArrowRight,
  Search,
  Settings,
  Bell,
  ChevronRight,
  MoreHorizontal,
  Zap,
  Folder,
  HardDrive,
  Cloud,
  Download,
  Upload,
  FileJson,
  Database
} from 'lucide-react'
import { useDocumentStore, type DocumentType } from '../stores/document'
import { useStorageStore, serializeDocument } from '../stores/storage'
import type { StorageFormat, MindNestDocument } from '../types/storage'
import { cn } from '../utils/cn'

const typeConfig: Record<DocumentType, { icon: any; name: string; color: string; bgColor: string; gradient: string }> = {
  document: {
    icon: FileText,
    name: '文档',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    gradient: 'from-blue-500 to-cyan-500'
  },
  spreadsheet: {
    icon: Table2,
    name: '数据表',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    gradient: 'from-green-500 to-emerald-500'
  },
  whiteboard: {
    icon: LayoutGrid,
    name: '画板',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    gradient: 'from-purple-500 to-pink-500'
  },
  note: {
    icon: StickyNote,
    name: '小记',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    gradient: 'from-slate-500 to-gray-500'
  }
}

const formatConfig: Record<StorageFormat, { name: string; ext: string; desc: string; icon: any }> = {
  markdown: {
    name: 'Markdown',
    ext: '.md',
    desc: '纯文本格式，兼容 Obsidian',
    icon: FileText
  },
  mindnest: {
    name: 'MindNest',
    ext: '.mn',
    desc: '原生格式，保留完整块信息',
    icon: FileJson
  },
  hybrid: {
    name: 'Hybrid',
    ext: '.md',
    desc: 'Markdown + 隐藏块数据',
    icon: Database
  }
}

export function HomePage() {
  const navigate = useNavigate()
  const { documents, recentDocuments, loadRecentDocuments, createDocument, listDocuments } = useDocumentStore()
  const { config, setConfig, recentFiles, addRecentFile, saveDocument, exportDocument } = useStorageStore()
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<StorageFormat>(config.defaultFormat)
  
  // 默认知识库 ID（开发用）
  const DEFAULT_KB_ID = 'default_kb'

  useEffect(() => {
    // 从后端加载文档列表，然后更新最近文档
    listDocuments(DEFAULT_KB_ID).then(() => {
      loadRecentDocuments()
    })
  }, [])

  const stats = [
    { label: '文档', value: documents.filter(d => d.type === 'document').length, icon: FileText, color: typeConfig.document.color, bgColor: typeConfig.document.bgColor },
    { label: '数据表', value: documents.filter(d => d.type === 'spreadsheet').length, icon: Table2, color: typeConfig.spreadsheet.color, bgColor: typeConfig.spreadsheet.bgColor },
    { label: '画板', value: documents.filter(d => d.type === 'whiteboard').length, icon: LayoutGrid, color: typeConfig.whiteboard.color, bgColor: typeConfig.whiteboard.bgColor },
    { label: '小记', value: documents.filter(d => d.type === 'note').length, icon: StickyNote, color: typeConfig.note.color, bgColor: typeConfig.note.bgColor },
  ]

  const quickActions = [
    { type: 'document' as DocumentType, title: '写文档', desc: '富文本编辑器，支持 Markdown 语法' },
    { type: 'spreadsheet' as DocumentType, title: '建数据表', desc: '表格、看板、日历多视图' },
    { type: 'whiteboard' as DocumentType, title: '创建画板', desc: '自由绘制、思维导图' },
    { type: 'note' as DocumentType, title: '记小记', desc: '快速记录想法和灵感' },
  ]

  const handleCreate = async (type: DocumentType, format: StorageFormat) => {
    const defaultTitle = type === 'document' ? '无标题文档' : 
                        type === 'spreadsheet' ? '无标题数据表' :
                        type === 'whiteboard' ? '无标题画板' : '小记'
    
    const doc = await createDocument(DEFAULT_KB_ID, defaultTitle, undefined, undefined, type)
    if (!doc) return
    
    // 创建 MindNest 文档对象
    const mindNestDoc: MindNestDocument = {
      metadata: {
        id: doc.id,
        title: doc.title,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        tags: [],
        type: doc.type,
        format: format,
        version: 1
      },
      blocks: type === 'document' ? [
        { id: '1', type: 'heading1', content: doc.title },
        { id: '2', type: 'paragraph', content: '' }
      ] : undefined,
      content: doc.content,
      data: doc.data
    }
    
    // 保存到存储
    const path = await saveDocument(mindNestDoc, format)
    addRecentFile(path)
    
    setShowNewDialog(false)
    navigate(`/doc/${doc.id}?format=${format}`)
  }

  const handleExport = async (doc: any) => {
    const mindNestDoc: MindNestDocument = {
      metadata: {
        id: doc.id,
        title: doc.title,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        tags: [],
        type: doc.type,
        format: 'markdown',
        version: 1
      },
      blocks: [],
      content: doc.content
    }
    
    const content = await exportDocument(mindNestDoc, {
      format: 'markdown',
      includeMetadata: true,
      includeAttachments: false
    })
    
    // 创建下载
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.title || 'untitled'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return '刚刚'
    if (hours < 24) return `${hours} 小时前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} 天前`
    return new Date(date).toLocaleDateString()
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-background to-muted/20">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <div>
              <h1 className="font-bold text-lg">MindNest</h1>
              <p className="text-xs text-muted-foreground">本地知识库</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 存储位置显示 */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-xs text-muted-foreground">
              <HardDrive className="w-3.5 h-3.5" />
              <span className="max-w-[150px] truncate">{config.basePath || '未设置存储位置'}</span>
            </div>
            
            <button 
              onClick={() => navigate('/search')}
              className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate('/settings')}
              className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 ml-2" />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 欢迎区域 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h2 className="text-3xl font-bold mb-2">早上好！☀️</h2>
          <p className="text-muted-foreground text-lg">
            当前存储格式: <span className="font-medium text-foreground">{formatConfig[config.defaultFormat].name}</span>
            <span className="text-xs text-muted-foreground ml-2">({formatConfig[config.defaultFormat].desc})</span>
          </p>
        </motion.div>

        {/* 统计数据 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map((stat, index) => (
            <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + index * 0.05 }} className="relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer group">
              <div className={cn("absolute top-0 right-0 w-24 h-24 opacity-10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150", stat.bgColor)} />
              <div className="relative">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-3", stat.bgColor, stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* 格式选择器 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">默认存储格式</h3>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(formatConfig) as StorageFormat[]).map(format => {
              const config = formatConfig[format]
              const Icon = config.icon
              return (
                <button
                  key={format}
                  onClick={() => {
                    setSelectedFormat(format)
                    setConfig({ defaultFormat: format })
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                    selectedFormat === format
                      ? "bg-primary/5 border-primary"
                      : "bg-card border-border hover:border-primary/30"
                  )}
                >
                  <Icon className={cn("w-5 h-5", selectedFormat === format ? "text-primary" : "text-muted-foreground")} />
                  <div className="text-left">
                    <div className={cn("font-medium", selectedFormat === format ? "text-primary" : "")}>{config.name}</div>
                    <div className="text-xs text-muted-foreground">{config.ext} · {config.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* 快速开始 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              快速开始
            </h3>
            <button onClick={() => setShowNewDialog(true)} className="text-sm text-primary hover:underline flex items-center gap-1">
              更多选项 <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const config = typeConfig[action.type]
              return (
                <motion.button
                  key={action.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCreate(action.type, selectedFormat)}
                  className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors text-left group"
                >
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-colors", config.bgColor)}>
                    <config.icon className={cn("w-6 h-6", config.color)} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {action.title}
                      <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </div>
                    <div className="text-sm text-muted-foreground">{action.desc}</div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* 最近编辑 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              最近编辑
            </h3>
            <div className="flex items-center gap-2">
              <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-accent transition-colors">
                <Upload className="w-4 h-4" />
                导入
              </button>
              <button className="text-sm text-primary hover:underline">查看全部</button>
            </div>
          </div>

          {recentDocuments.length > 0 ? (
            <div className="space-y-2">
              {recentDocuments.slice(0, 6).map((doc, index) => {
                const config = typeConfig[doc.type] || typeConfig.document
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="w-full flex items-center gap-4 p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors text-left group cursor-pointer"
                    onClick={() => navigate(`/doc/${doc.id}`)}
                  >
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.bgColor)}>
                      <config.icon className={cn("w-5 h-5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{doc.title}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className={cn("px-1.5 py-0.5 rounded text-xs", config.bgColor, config.color)}>{config.name}</span>
                        <span>·</span>
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(doc.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleExport(doc); }} className="p-2 hover:bg-accent rounded-lg text-muted-foreground">
                        <Download className="w-4 h-4" />
                      </button>
                      {doc.isFavorite && <Star className="w-4 h-4 text-gray-400 fill-gray-400" />}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-card border border-dashed border-border rounded-xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Plus className="w-8 h-8" />
              </div>
              <p>还没有内容</p>
              <p className="text-sm mt-1">点击上方"快速开始"创建你的第一个文档</p>
            </div>
          )}
        </motion.div>

        {/* 提示卡片 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 border border-border">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">MindNest 支持多种存储格式</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                <strong className="text-foreground">Markdown (.md)</strong> 格式兼容 Obsidian、Typora 等工具，
                <strong className="text-foreground">MindNest (.mn)</strong> 格式保留完整的块信息和元数据。
                你可以随时导出为任意格式。
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-background rounded-full text-xs border">Markdown</span>
                <span className="px-3 py-1 bg-background rounded-full text-xs border">MindNest</span>
                <span className="px-3 py-1 bg-background rounded-full text-xs border">YAML Frontmatter</span>
                <span className="px-3 py-1 bg-background rounded-full text-xs border">本地文件</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 新建文档对话框 */}
      {showNewDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg bg-background rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">新建文档</h3>
              <button onClick={() => setShowNewDialog(false)} className="p-2 hover:bg-accent rounded-lg">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">选择格式</label>
                <div className="space-y-2">
                  {(Object.keys(formatConfig) as StorageFormat[]).map(format => {
                    const config = formatConfig[format]
                    const Icon = config.icon
                    return (
                      <button
                        key={format}
                        onClick={() => setSelectedFormat(format)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                          selectedFormat === format ? "bg-primary/5 border-primary" : "bg-card border-border hover:border-primary/30"
                        )}
                      >
                        <Icon className={cn("w-5 h-5", selectedFormat === format ? "text-primary" : "text-muted-foreground")} />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{config.name}</div>
                          <div className="text-xs text-muted-foreground">{config.desc}</div>
                        </div>
                        {selectedFormat === format && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setShowNewDialog(false)} className="px-4 py-2 rounded-lg hover:bg-accent transition-colors">取消</button>
              <button onClick={() => handleCreate('document', selectedFormat)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">创建</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 悬浮新建按钮 */}
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowNewDialog(true)} className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-500/30 flex items-center justify-center">
        <Plus className="w-7 h-7" />
      </motion.button>
    </div>
  )
}
