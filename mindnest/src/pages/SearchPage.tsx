import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDocumentStore } from '../stores/document'
import { fullTextSearch, semanticSearch } from '../hooks/useTauri'
import { cn } from '../utils/cn'
import {
  Search,
  FileText,
  Sparkles,
  Filter,
  Clock,
  X,
  ChevronRight,
  Command,
  Hash,
  Calendar,
  ArrowRight,
  Loader2,
  Highlighter,
} from 'lucide-react'

interface SearchResult {
  documentId: string
  title: string
  highlights: string[]
  score: number
  type?: string
  updatedAt?: string
}

interface SearchFilters {
  type: 'all' | 'document' | 'spreadsheet' | 'whiteboard' | 'note'
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year'
  sortBy: 'relevance' | 'recent' | 'title'
}

export function SearchPage() {
  const navigate = useNavigate()
  const { documents } = useDocumentStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [searchMode, setSearchMode] = useState<'fulltext' | 'semantic'>('fulltext')
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    dateRange: 'all',
    sortBy: 'relevance',
  })
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // 加载最近搜索
  useEffect(() => {
    const saved = localStorage.getItem('mindnest-recent-searches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // 保存最近搜索
  const saveRecentSearch = useCallback((q: string) => {
    if (!q.trim()) return
    setRecentSearches(prev => {
      const newSearches = [q, ...prev.filter(s => s !== q)].slice(0, 10)
      localStorage.setItem('mindnest-recent-searches', JSON.stringify(newSearches))
      return newSearches
    })
  }, [])

  // 执行搜索
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    
    try {
      const searchResults = searchMode === 'fulltext'
        ? await fullTextSearch(searchQuery, undefined, 20)
        : await semanticSearch(searchQuery)
      
      // 获取文档额外信息
      const enrichedResults = searchResults.map(result => {
        const doc = documents.find(d => d.id === result.documentId)
        return {
          ...result,
          type: doc?.type || 'document',
          updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
        }
      })
      
      // 应用过滤器
      let filtered = enrichedResults
      
      if (filters.type !== 'all') {
        filtered = filtered.filter(r => r.type === filters.type)
      }
      
      if (filters.dateRange !== 'all') {
        const now = new Date()
        const ranges: Record<string, number> = {
          today: 1,
          week: 7,
          month: 30,
          year: 365,
        }
        const days = ranges[filters.dateRange]
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
        
        filtered = filtered.filter(r => {
          if (!r.updatedAt) return false
          return new Date(r.updatedAt) >= cutoff
        })
      }
      
      // 排序
      if (filters.sortBy === 'recent') {
        filtered.sort((a, b) => {
          if (!a.updatedAt) return 1
          if (!b.updatedAt) return -1
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        })
      } else if (filters.sortBy === 'title') {
        filtered.sort((a, b) => a.title.localeCompare(b.title))
      }
      
      setResults(filtered)
      saveRecentSearch(searchQuery)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [documents, filters, searchMode, saveRecentSearch])

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, performSearch])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K 聚焦搜索框
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      // ESC 清空搜索
      if (e.key === 'Escape') {
        setQuery('')
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const clearSearch = () => {
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }

  const handleResultClick = (result: SearchResult) => {
    navigate(`/doc/${result.documentId}`)
  }

  const typeIcons: Record<string, any> = {
    document: FileText,
    spreadsheet: FileText,
    whiteboard: FileText,
    note: FileText,
  }

  const typeColors: Record<string, string> = {
    document: 'bg-blue-100 text-blue-700',
    spreadsheet: 'bg-green-100 text-green-700',
    whiteboard: 'bg-purple-100 text-purple-700',
    note: 'bg-amber-100 text-amber-700',
  }

  const typeLabels: Record<string, string> = {
    document: '文档',
    spreadsheet: '数据表',
    whiteboard: '画板',
    note: '小记',
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* 搜索框 */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              {isSearching ? (
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              ) : (
                <Search className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchMode === 'semantic' ? '描述你想找的内容...' : '搜索文档、笔记...'}
              className="w-full pl-12 pr-12 py-4 text-lg bg-card border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
              autoFocus
            />
            
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {query && (
                <button
                  onClick={clearSearch}
                  className="p-1.5 hover:bg-accent rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-lg text-xs text-muted-foreground">
                <Command className="w-3 h-3" />
                <span>K</span>
              </div>
            </div>
          </div>

          {/* 搜索模式和过滤器 */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              {/* 搜索模式切换 */}
              <div className="flex items-center bg-muted rounded-lg p-1">
                <button
                  onClick={() => setSearchMode('fulltext')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all",
                    searchMode === 'fulltext'
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Highlighter className="w-3.5 h-3.5" />
                  全文搜索
                </button>
                <button
                  onClick={() => setSearchMode('semantic')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all",
                    searchMode === 'semantic'
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  语义搜索
                </button>
              </div>

              {/* 过滤器按钮 */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all",
                  showFilters
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                筛选
              </button>
            </div>

            {/* 结果统计 */}
            {query && (
              <div className="text-sm text-muted-foreground">
                找到 {results.length} 个结果
              </div>
            )}
          </div>

          {/* 过滤器面板 */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 grid grid-cols-3 gap-4">
                  {/* 类型筛选 */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      文档类型
                    </label>
                    <select
                      value={filters.type}
                      onChange={(e) => setFilters(f => ({ ...f, type: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
                    >
                      <option value="all">全部类型</option>
                      <option value="document">文档</option>
                      <option value="spreadsheet">数据表</option>
                      <option value="whiteboard">画板</option>
                      <option value="note">小记</option>
                    </select>
                  </div>

                  {/* 时间范围 */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      时间范围
                    </label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => setFilters(f => ({ ...f, dateRange: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
                    >
                      <option value="all">全部时间</option>
                      <option value="today">今天</option>
                      <option value="week">最近7天</option>
                      <option value="month">最近30天</option>
                      <option value="year">最近一年</option>
                    </select>
                  </div>

                  {/* 排序方式 */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      排序方式
                    </label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters(f => ({ ...f, sortBy: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
                    >
                      <option value="relevance">相关度</option>
                      <option value="recent">最近更新</option>
                      <option value="title">标题</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {query ? (
            /* 搜索结果 */
            results.length > 0 ? (
              <div className="space-y-3">
                {results.map((result, index) => {
                  const Icon = typeIcons[result.type || 'document'] || FileText
                  
                  return (
                    <motion.div
                      key={result.documentId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleResultClick(result)}
                      className="group p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        {/* 图标 */}
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          typeColors[result.type || 'document']
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* 内容 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                              {result.title}
                            </h3>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              typeColors[result.type || 'document']
                            )}>
                              {typeLabels[result.type || 'document']}
                            </span>
                          </div>

                          {/* 高亮片段 */}
                          {result.highlights && result.highlights.length > 0 && (
                            <div className="space-y-1 mt-2">
                              {result.highlights.map((highlight, i) => (
                                <p key={i} className="text-sm text-muted-foreground line-clamp-1">
                                  {highlight}
                                </p>
                              ))}
                            </div>
                          )}

                          {/* 元信息 */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              相关度 {(result.score * 100).toFixed(0)}%
                            </span>
                            {result.updatedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(result.updatedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 箭头 */}
                        <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : !isSearching ? (
              /* 无结果 */
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">未找到相关结果</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  尝试使用不同的关键词，或者检查拼写是否正确
                </p>
                {searchMode === 'fulltext' && (
                  <button
                    onClick={() => setSearchMode('semantic')}
                    className="mt-4 text-primary hover:underline flex items-center gap-1 mx-auto"
                  >
                    <Sparkles className="w-4 h-4" />
                    尝试语义搜索
                  </button>
                )}
              </div>
            ) : null
          ) : (
            /* 初始状态 / 最近搜索 */
            <div>
              {recentSearches.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    最近搜索
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((search, i) => (
                      <button
                        key={i}
                        onClick={() => setQuery(search)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-accent rounded-lg text-sm transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 快速导航 */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  快速访问
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {documents.slice(0, 6).map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => navigate(`/doc/${doc.id}`)}
                      className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all text-left"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        typeColors[doc.type]
                      )}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{doc.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>

              {/* 搜索提示 */}
              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100">
                      搜索技巧
                    </h4>
                    <ul className="mt-2 text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• 使用关键词搜索文档标题和内容</li>
                      <li>• 尝试语义搜索理解自然语言查询</li>
                      <li>• 使用过滤器缩小搜索范围</li>
                      <li>• 按 <kbd className="px-1.5 py-0.5 bg-white dark:bg-blue-800 rounded">Cmd + K</kbd> 快速打开搜索</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
