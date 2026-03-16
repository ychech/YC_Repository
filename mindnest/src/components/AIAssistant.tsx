import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../utils/cn'
import {
  Sparkles,
  Send,
  Loader2,
  X,
  Wand2,
  AlignLeft,
  Languages,
  MoreHorizontal,
  ChevronRight,
  MessageSquare,
  Lightbulb,
  Type,
  Check,
  Copy,
} from 'lucide-react'
import * as tauri from '../hooks/useTauri'

interface AIAssistantProps {
  documentContent?: string
  documentId?: string
  onInsertText?: (text: string) => void
  onReplaceText?: (text: string) => void
}

type AIAction = 'chat' | 'continue' | 'polish' | 'summarize' | 'translate'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function AIAssistant({
  documentContent,
  documentId,
  onInsertText,
  onReplaceText,
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<AIAction>('chat')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [targetLang, setTargetLang] = useState('英文')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 监听选中的文本
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()?.toString() || ''
      setSelectedText(selection)
    }
    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await tauri.chatWithContext([
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: input },
      ], documentId ? [documentId] : undefined)

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('AI error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = async (action: AIAction) => {
    if (!documentContent && !selectedText) return

    setIsLoading(true)
    const context = selectedText || documentContent || ''

    try {
      let result = ''

      switch (action) {
        case 'continue':
          result = await tauri.continueWriting(context)
          break
        case 'polish':
          result = await tauri.polishText(selectedText || context)
          break
        case 'summarize':
          result = await tauri.generateSummary(context, 200)
          break
        case 'translate':
          result = await tauri.translateText(selectedText || context, targetLang)
          break
      }

      if (action === 'chat') {
        setActiveTab('chat')
      } else {
        // 其他操作直接插入结果
        const actionNames: Record<AIAction, string> = {
          chat: '对话',
          continue: '续写',
          polish: '润色',
          summarize: '摘要',
          translate: '翻译',
        }

        const aiMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `**${actionNames[action]}结果：**\n\n${result}\n\n您可以点击下方的「插入」或「替换」按钮将内容应用到文档中。`,
          timestamp: new Date(),
        }

        setMessages(prev => [...prev, {
          id: (Date.now() - 1).toString(),
          role: 'user',
          content: `执行${actionNames[action]}操作`,
          timestamp: new Date(),
        }, aiMessage])

        setActiveTab('chat')
      }
    } catch (error) {
      console.error('AI action error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const quickActions = [
    { id: 'continue', label: '续写', icon: ChevronRight, description: '基于上下文继续写作' },
    { id: 'polish', label: '润色', icon: Sparkles, description: '改进表达和语法' },
    { id: 'summarize', label: '摘要', icon: AlignLeft, description: '生成内容摘要' },
    { id: 'translate', label: '翻译', icon: Languages, description: `翻译为${targetLang}` },
  ] as const

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
      className="fixed bottom-6 right-6 w-96 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI 助手</h3>
            <p className="text-xs text-muted-foreground">智能写作辅助</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 hover:bg-accent rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b border-border">
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={() => handleAction(action.id as AIAction)}
                disabled={isLoading || (!documentContent && !selectedText)}
                className="flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Icon className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-sm font-medium">{action.label}</div>
                  <div className="text-[10px] text-muted-foreground">{action.description}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* 翻译语言选择 */}
        {activeTab === 'translate' && (
          <div className="mt-2 flex gap-1">
            {['英文', '中文', '日文', '韩文'].map((lang) => (
              <button
                key={lang}
                onClick={() => setTargetLang(lang)}
                className={cn(
                  "px-2 py-1 text-xs rounded transition-colors",
                  targetLang === lang
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-accent"
                )}
              >
                {lang}
              </button>
            ))}
          </div>
        )}

        {/* 选中文本提示 */}
        {selectedText && (
          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            已选中 {selectedText.length} 个字符
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="h-64 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">开始与 AI 对话</p>
            <p className="text-xs mt-1">或选择上方的快速操作</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2",
                message.role === 'user' ? "flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                message.role === 'assistant'
                  ? "bg-gradient-to-br from-blue-500 to-purple-600"
                  : "bg-muted"
              )}>
                {message.role === 'assistant' ? (
                  <Sparkles className="w-4 h-4 text-white" />
                ) : (
                  <span className="text-xs font-medium">我</span>
                )}
              </div>
              <div className={cn(
                "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                message.role === 'assistant'
                  ? "bg-muted"
                  : "bg-primary text-primary-foreground"
              )}>
                <div className="prose prose-sm dark:prose-invert">
                  {message.content}
                </div>
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-1 mt-2">
                    <button
                      onClick={() => onInsertText?.(message.content.replace(/\*\*/g, ''))}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      插入
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      onClick={() => onReplaceText?.(message.content.replace(/\*\*/g, ''))}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      替换
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(message.content.replace(/\*\*/g, ''))}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-muted/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入指令..."
            className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
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
