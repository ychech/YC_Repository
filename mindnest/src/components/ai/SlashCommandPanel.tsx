import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wand2, 
  AlignLeft, 
  Languages, 
  List,
  Table,
  Brain,
  Calendar,
  CheckSquare,
  Image,
  Code,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Sparkles,
  ChevronRight
} from 'lucide-react'
import { cn } from '../../utils/cn'

export interface SlashCommand {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  shortcut?: string
  category: 'ai' | 'block' | 'media' | 'advanced'
  action: () => void
  disabled?: boolean
}

interface SlashCommandPanelProps {
  // 是否显示
  open: boolean
  
  // 搜索词
  query: string
  
  // 面板位置
  position: { x: number; y: number }
  
  // 命令选择回调
  onSelect: (command: SlashCommand) => void
  
  // 关闭回调
  onClose: () => void
  
  // 自定义命令
  customCommands?: SlashCommand[]
}

// 默认命令列表
const defaultCommands: Omit<SlashCommand, 'action'>[] = [
  // AI 命令
  {
    id: 'ai-continue',
    label: '继续写作',
    description: 'AI 基于上下文继续写作',
    icon: Wand2,
    shortcut: '//',
    category: 'ai',
  },
  {
    id: 'ai-polish',
    label: '润色文字',
    description: '改进表达和语法',
    icon: Sparkles,
    category: 'ai',
  },
  {
    id: 'ai-summarize',
    label: '生成摘要',
    description: '总结当前段落',
    icon: AlignLeft,
    category: 'ai',
  },
  {
    id: 'ai-translate',
    label: '翻译',
    description: '翻译选中文本',
    icon: Languages,
    category: 'ai',
  },
  
  // 块类型命令
  {
    id: 'block-heading1',
    label: '大标题',
    description: '创建一级标题',
    icon: Heading1,
    shortcut: '#',
    category: 'block',
  },
  {
    id: 'block-heading2',
    label: '中标题',
    description: '创建二级标题',
    icon: Heading2,
    shortcut: '##',
    category: 'block',
  },
  {
    id: 'block-heading3',
    label: '小标题',
    description: '创建三级标题',
    icon: Heading3,
    shortcut: '###',
    category: 'block',
  },
  {
    id: 'block-bullet',
    label: '无序列表',
    description: '创建项目符号列表',
    icon: List,
    shortcut: '-',
    category: 'block',
  },
  {
    id: 'block-todo',
    label: '待办事项',
    description: '创建待办清单',
    icon: CheckSquare,
    shortcut: '[]',
    category: 'block',
  },
  {
    id: 'block-quote',
    label: '引用',
    description: '创建引用块',
    icon: Quote,
    shortcut: '>',
    category: 'block',
  },
  {
    id: 'block-code',
    label: '代码块',
    description: '创建代码块',
    icon: Code,
    shortcut: '```',
    category: 'block',
  },
  {
    id: 'block-table',
    label: '表格',
    description: '插入表格',
    icon: Table,
    category: 'block',
  },
  
  // 高级功能
  {
    id: 'advanced-mindmap',
    label: '思维导图',
    description: '从内容生成思维导图',
    icon: Brain,
    category: 'advanced',
  },
  {
    id: 'advanced-calendar',
    label: '日历事件',
    description: '创建日历事件',
    icon: Calendar,
    category: 'advanced',
  },
  
  // 媒体
  {
    id: 'media-image',
    label: '图片',
    description: '插入图片',
    icon: Image,
    category: 'media',
  },
]

const categoryLabels: Record<string, string> = {
  ai: '🤖 AI 助手',
  block: '📝 基础块',
  advanced: '✨ 高级功能',
  media: '🖼️ 媒体'
}

const categoryOrder = ['ai', 'block', 'advanced', 'media']

export function SlashCommandPanel({
  open,
  query,
  position,
  onSelect,
  onClose,
  customCommands = []
}: SlashCommandPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  
  // 合并默认命令和自定义命令
  const allCommands = useMemo(() => {
    const commands = [...defaultCommands, ...customCommands]
    return commands.map(cmd => ({
      ...cmd,
      action: () => onSelect(cmd as SlashCommand)
    })) as SlashCommand[]
  }, [customCommands, onSelect])
  
  // 过滤命令
  const filteredCommands = useMemo(() => {
    if (!query) return allCommands
    
    const lowerQuery = query.toLowerCase()
    return allCommands.filter(cmd => 
      cmd.label.toLowerCase().includes(lowerQuery) ||
      cmd.description.toLowerCase().includes(lowerQuery) ||
      cmd.id.includes(lowerQuery)
    )
  }, [allCommands, query])
  
  // 按类别分组
  const groupedCommands = useMemo(() => {
    const groups: Record<string, SlashCommand[]> = {}
    
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = []
      }
      groups[cmd.category].push(cmd)
    })
    
    return groups
  }, [filteredCommands])
  
  // 扁平化的命令列表（用于键盘导航）
  const flatCommands = useMemo(() => {
    const result: SlashCommand[] = []
    categoryOrder.forEach(cat => {
      if (groupedCommands[cat]) {
        result.push(...groupedCommands[cat])
      }
    })
    return result
  }, [groupedCommands])
  
  // 键盘导航
  useEffect(() => {
    if (!open) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < flatCommands.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : flatCommands.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (flatCommands[selectedIndex]) {
            flatCommands[selectedIndex].action()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, flatCommands, selectedIndex, onClose])
  
  // 重置选中状态
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])
  
  // 滚动到选中项
  useEffect(() => {
    const element = itemRefs.current[selectedIndex]
    if (element) {
      element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex])
  
  // 计算位置（确保不超出视口）
  const adjustedPosition = useMemo(() => {
    const panelWidth = 320
    const panelHeight = 400
    
    let x = position.x
    let y = position.y
    
    // 水平边界
    if (x + panelWidth > window.innerWidth - 20) {
      x = window.innerWidth - panelWidth - 20
    }
    if (x < 20) {
      x = 20
    }
    
    // 垂直边界
    if (y + panelHeight > window.innerHeight - 20) {
      y = position.y - panelHeight - 20 // 显示在上方
    }
    if (y < 20) {
      y = 20
    }
    
    return { x, y }
  }, [position])
  
  if (!open || flatCommands.length === 0) return null
  
  let globalIndex = 0
  
  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        style={{ 
          left: adjustedPosition.x, 
          top: adjustedPosition.y,
          maxHeight: '400px'
        }}
      >
        {/* 搜索提示 */}
        {query && (
          <div className="px-3 py-2 border-b border-border bg-muted/50">
            <span className="text-xs text-muted-foreground">
              搜索: "{query}"
            </span>
          </div>
        )}
        
        {/* 命令列表 */}
        <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
          {flatCommands.length === 0 ? (
            <div className="px-3 py-8 text-center text-muted-foreground">
              <p className="text-sm">没有找到匹配的命令</p>
            </div>
          ) : (
            categoryOrder.map(category => {
              const commands = groupedCommands[category]
              if (!commands || commands.length === 0) return null
              
              return (
                <div key={category}>
                  {/* 类别标题 */}
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/30 sticky top-0">
                    {categoryLabels[category]}
                  </div>
                  
                  {/* 命令项 */}
                  {commands.map((command) => {
                    const isSelected = globalIndex === selectedIndex
                    const index = globalIndex++
                    
                    return (
                      <button
                        key={command.id}
                        ref={el => { itemRefs.current[index] = el }}
                        onClick={() => command.action()}
                        disabled={command.disabled}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                          isSelected 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-muted",
                          command.disabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <command.icon className={cn(
                          "w-4 h-4 shrink-0",
                          isSelected ? "text-primary-foreground" : "text-muted-foreground"
                        )} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {command.label}
                            </span>
                            {command.shortcut && (
                              <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded",
                                isSelected 
                                  ? "bg-primary-foreground/20" 
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {command.shortcut}
                              </span>
                            )}
                          </div>
                          <p className={cn(
                            "text-xs truncate",
                            isSelected 
                              ? "text-primary-foreground/70" 
                              : "text-muted-foreground"
                          )}>
                            {command.description}
                          </p>
                        </div>
                        
                        {isSelected && (
                          <ChevronRight className="w-4 h-4 shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
        
        {/* 底部提示 */}
        <div className="px-3 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted rounded">↓</kbd>
              导航
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">↵</kbd>
              选择
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded">Esc</kbd>
            关闭
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
