import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wand2, 
  Languages, 
  AlignLeft, 
  HelpCircle, 
  ChevronDown,
  Sparkles,
  Check,
  X,
  Loader2,
  Type,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useTextSelection, useAIRewrite } from '../../ai/hooks'
import type { RewriteStyle } from '../../ai/core/types'

interface SelectionToolbarProps {
  // 容器选择器，限制选择监听范围
  containerSelector?: string
  
  // 重写后的回调
  onRewrite?: (originalText: string, newText: string) => void
  
  // 插入内容的回调
  onInsert?: (text: string) => void
}

// 重写风格选项
const rewriteStyles: Array<{ value: RewriteStyle; label: string; icon: string }> = [
  { value: 'formal', label: '正式', icon: '📜' },
  { value: 'casual', label: '随意', icon: '💬' },
  { value: 'concise', label: '简洁', icon: '✂️' },
  { value: 'elaborate', label: '详细', icon: '📖' },
  { value: 'professional', label: '专业', icon: '💼' },
  { value: 'creative', label: '创意', icon: '🎨' },
]

// 翻译语言选项
const languages = [
  { code: '英文', label: 'English', flag: '🇺🇸' },
  { code: '中文', label: '中文', flag: '🇨🇳' },
  { code: '日文', label: '日本語', flag: '🇯🇵' },
  { code: '韩文', label: '한국어', flag: '🇰🇷' },
  { code: '法文', label: 'Français', flag: '🇫🇷' },
  { code: '德文', label: 'Deutsch', flag: '🇩🇪' },
  { code: '西班牙文', label: 'Español', flag: '🇪🇸' },
]

export function SelectionToolbar({ 
  containerSelector,
  onRewrite,
  onInsert 
}: SelectionToolbarProps) {
  const { 
    text, 
    hasSelection, 
    position, 
    clearSelection,
    replaceSelection 
  } = useTextSelection({ 
    containerSelector,
    minLength: 2 
  })
  
  const { isLoading, rewrite, translate, summarize, explain } = useAIRewrite()
  
  const [showRewriteMenu, setShowRewriteMenu] = useState(false)
  const [showTranslateMenu, setShowTranslateMenu] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  
  const toolbarRef = useRef<HTMLDivElement>(null)
  
  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        // 延迟关闭，让用户有时间点击菜单
        setTimeout(() => {
          setShowRewriteMenu(false)
          setShowTranslateMenu(false)
        }, 200)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // 处理重写
  const handleRewrite = async (style: RewriteStyle) => {
    setActiveAction('rewrite')
    setShowRewriteMenu(false)
    
    const result = await rewrite(text, style)
    if (result) {
      setResult(result)
    }
    setActiveAction(null)
  }
  
  // 处理翻译
  const handleTranslate = async (lang: string) => {
    setActiveAction('translate')
    setShowTranslateMenu(false)
    
    const result = await translate(text, lang)
    if (result) {
      setResult(result)
    }
    setActiveAction(null)
  }
  
  // 处理摘要
  const handleSummarize = async () => {
    setActiveAction('summarize')
    
    const result = await summarize(text)
    if (result) {
      setResult(result)
    }
    setActiveAction(null)
  }
  
  // 处理解释
  const handleExplain = async () => {
    setActiveAction('explain')
    
    const result = await explain(text)
    if (result) {
      setResult(result)
    }
    setActiveAction(null)
  }
  
  // 应用结果
  const handleApply = () => {
    if (result) {
      replaceSelection(result)
      onRewrite?.(text, result)
      setResult(null)
      clearSelection()
    }
  }
  
  // 取消
  const handleCancel = () => {
    setResult(null)
    setShowRewriteMenu(false)
    setShowTranslateMenu(false)
  }
  
  // 计算位置
  const getPosition = () => {
    if (!position) return { top: 0, left: 0 }
    
    // 确保工具栏不超出视口
    const toolbarWidth = 320
    const toolbarHeight = 50
    
    let left = position.x - toolbarWidth / 2
    let top = position.y - toolbarHeight - 10
    
    // 边界检查
    if (left < 10) left = 10
    if (left + toolbarWidth > window.innerWidth - 10) {
      left = window.innerWidth - toolbarWidth - 10
    }
    if (top < 10) {
      top = position.y + 20 // 显示在选区下方
    }
    
    return { top, left }
  }
  
  if (!hasSelection) return null
  
  const pos = getPosition()
  
  return (
    <AnimatePresence>
      <motion.div
        ref={toolbarRef}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="ai-selection-toolbar fixed z-50"
        style={{ top: pos.top, left: pos.left }}
      >
        {result ? (
          // 结果显示模式
          <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden w-80">
            <div className="p-3 bg-muted/50 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">AI 生成结果</span>
              </div>
              <button 
                onClick={handleCancel}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-3 max-h-48 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">{result}</p>
            </div>
            
            <div className="p-3 border-t border-border flex gap-2">
              <button
                onClick={handleApply}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
              >
                <Check className="w-4 h-4" />
                替换
              </button>
              <button
                onClick={() => { onInsert?.(result); handleCancel() }}
                className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted"
              >
                插入
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          // 工具栏模式
          <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center p-1.5 gap-0.5">
              {/* 重写按钮 */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowRewriteMenu(!showRewriteMenu)
                    setShowTranslateMenu(false)
                  }}
                  disabled={isLoading}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    showRewriteMenu 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  )}
                >
                  {activeAction === 'rewrite' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  重写
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {/* 重写风格菜单 */}
                <AnimatePresence>
                  {showRewriteMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute top-full left-0 mt-2 bg-card border border-border rounded-xl shadow-xl p-2 w-48"
                    >
                      <div className="text-xs text-muted-foreground px-2 py-1">
                        选择风格
                      </div>
                      {rewriteStyles.map((style) => (
                        <button
                          key={style.value}
                          onClick={() => handleRewrite(style.value)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-muted text-left"
                        >
                          <span>{style.icon}</span>
                          {style.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="w-px h-5 bg-border mx-1" />
              
              {/* 翻译按钮 */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowTranslateMenu(!showTranslateMenu)
                    setShowRewriteMenu(false)
                  }}
                  disabled={isLoading}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    showTranslateMenu 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  )}
                >
                  {activeAction === 'translate' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Languages className="w-4 h-4" />
                  )}
                  翻译
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {/* 语言菜单 */}
                <AnimatePresence>
                  {showTranslateMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute top-full left-0 mt-2 bg-card border border-border rounded-xl shadow-xl p-2 w-44"
                    >
                      <div className="text-xs text-muted-foreground px-2 py-1">
                        选择语言
                      </div>
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => handleTranslate(lang.code)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-muted text-left"
                        >
                          <span>{lang.flag}</span>
                          {lang.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* 摘要按钮 */}
              <button
                onClick={handleSummarize}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                {activeAction === 'summarize' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <AlignLeft className="w-4 h-4" />
                )}
                摘要
              </button>
              
              {/* 解释按钮 */}
              <button
                onClick={handleExplain}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                {activeAction === 'explain' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <HelpCircle className="w-4 h-4" />
                )}
                解释
              </button>
            </div>
            
            {/* 选中文字预览 */}
            <div className="px-3 py-2 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                <span className="font-medium">已选中:</span> {text.slice(0, 50)}
                {text.length > 50 && '...'}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
