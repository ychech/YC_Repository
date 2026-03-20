import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  Send, 
  Loader2, 
  X,
  ChevronRight,
  MessageSquare,
  Check,
  Copy,
  RotateCcw,
  Trash2,
  FileText,
  ExternalLink,
  MoreHorizontal,
  Wand2,
  AlignLeft,
  Languages,
  BookOpen
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useAIChat } from '../../ai/hooks'
import type { Message, Citation } from '../../ai/core/types'

interface EnhancedAIChatProps {
  // 关联的文档
  documentId?: string
  documentContent?: string
  documentTitle?: string
  
  // 回调
  onInsertText?: (text: string) => void
  onReplaceText?: (text: string) => void
  onClose?: () => void
}

// 快速操作按钮
const quickActions = [
  { id: 'continue', label: '续写', icon: ChevronRight, description: '基于上下文继续写作' },
  { id: 'polish', label: '润色', icon: Wand2, description: '改进表达和语法' },
  { id: 'summarize', label: '摘要', icon: AlignLeft, description: '生成内容摘要' },
  { id: 'explain', label: '解释', icon: BookOpen, description: '解释概念' },
]

// 引用显示组件
function CitationBadge({ citation, index }: { citation: Citation; index: number }) {
  const [showPreview, setShowPreview] = useState(false)
  
  return (
    <span className="relative inline-block">
      <button
        onMouseEnter={() => setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
        onClick={() => {/* 跳转到文档 */}}
        className="inline-flex items-center gap-0.5 px-1 py-0.5 mx-0.5 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
      >
        <FileText className="w-3 h-3" />
        [{index + 1}]
      </button>
      
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-card border border-border rounded-xl shadow-xl z-50"
          >
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <FileText className="w-3 h-3" />
              {citation.documentTitle || '相关文档'}
              <span className="ml-auto">
                相关度: {Math.round(citation.relevanceScore * 100)}%
              </span>
            </div>
            <p className="text-sm line-clamp-3">{citation.content}</p>
            <div className="mt-2 flex justify-end">
              <button className="text-xs text-primary hover:underline flex items-center gap-1">
                查看原文 <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

// 消息内容组件（支持引用）
function MessageContent({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  // 解析内容中的引用标记
  const renderContent = () => {
    if (!message.citations || message.citations.length === 0) {
      return <p className="whitespace-pre-wrap">{message.content}</p>
    }
    
    // 简单处理：在内容末尾添加引用
    return (
      <div>
        <p className="whitespace-pre-wrap">{message.content}</p>
        <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground mr-1">参考:</span>
          {message.citations.map((citation, index) => (
            <CitationBadge 
              key={citation.id} 
              citation={citation} 
              index={index} 
            />
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="group">
      {renderContent()}
      
      {message.role === 'assistant' && (
        <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      )}
    </div>
  )
}

// 消息项组件
function MessageItem({ 
  message, 
  onRegenerate,
  onDelete 
}: { 
  message: Message
  onRegenerate?: () => void
  onDelete?: () => void
}) {
  const isUser = message.role === 'user'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : ""
      )}
    >
      {/* 头像 */}
      <div className={cn(
        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
        isUser 
          ? "bg-muted" 
          : "bg-gradient-to-br from-blue-500 to-purple-600"
      )}>
        {isUser ? (
          <span className="text-sm font-medium">我</span>
        ) : (
          <Sparkles className="w-4 h-4 text-white" />
        )}
      </div>
      
      {/* 内容 */}
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted"
      )}>
        <MessageContent message={message} />
        
        {/* 元数据 */}
        {!isUser && message.metadata && (
          <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-3 text-[10px] text-muted-foreground">
            {message.metadata.model && (
              <span>模型: {message.metadata.model}</span>
            )}
            {message.metadata.tokensUsed && (
              <span>Tokens: {message.metadata.tokensUsed}</span>
            )}
            <span>{message.timestamp.toLocaleTimeString()}</span>
          </div>
        )}
      </div>
      
      {/* 操作按钮 */}
      {!isUser && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
          <button
            onClick={onRegenerate}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"
            title="重新生成"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

export function EnhancedAIChat({
  documentId,
  documentContent,
  documentTitle,
  onInsertText,
  onReplaceText,
  onClose
}: EnhancedAIChatProps) {
  const [input, setInput] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    executeQuickAction,
    clearMessages,
    regenerate,
    deleteMessage
  } = useAIChat({
    documentId,
    documentContent
  })
  
  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // 聚焦输入框
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])
  
  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    await sendMessage(input)
    setInput('')
  }
  
  const handleQuickAction = async (actionId: string) => {
    await executeQuickAction(actionId as any)
  }
  
  const handleClose = () => {
    setIsOpen(false)
    onClose?.()
  }
  
  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-xl shadow-blue-500/30 flex items-center justify-center hover:shadow-2xl hover:scale-105 transition-all z-50"
      >
        <Sparkles className="w-6 h-6" />
      </motion.button>
    )
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 w-[420px] bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
      style={{ maxHeight: 'calc(100vh - 100px)', height: '600px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">AI 助手</h3>
            {documentTitle && (
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                {documentTitle}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={clearMessages}
            className="p-2 hover:bg-muted rounded-lg text-muted-foreground"
            title="清空对话"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-lg text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="p-4 border-b border-border">
          <p className="text-xs text-muted-foreground mb-3">快速操作</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  disabled={isLoading || !documentContent}
                  className="flex items-start gap-2 p-2.5 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">{action.label}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {action.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">开始与 AI 对话</p>
            <p className="text-xs mt-1">我可以帮你写作、翻译、总结内容</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageItem
              key={message.id}
              message={message}
              onRegenerate={() => regenerate(message.id)}
              onDelete={() => deleteMessage(message.id)}
            />
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-600">
            出错了: {error.message}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="输入问题或指令..."
            className="flex-1 px-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          AI 生成内容仅供参考，请核实重要信息
        </p>
      </div>
    </motion.div>
  )
}
