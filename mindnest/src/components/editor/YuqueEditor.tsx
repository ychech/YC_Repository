import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '../../utils/cn'
import { useSettingsStore } from '../../stores/settings'
import { 
  Bold, Italic, Underline, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered, 
  CheckSquare, Quote, Link, Image, Table, Minus,
  Eye, Edit3
} from 'lucide-react'

type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 
  'bullet' | 'ordered' | 'todo' | 'quote' | 'code' | 'divider'

interface Block {
  id: string
  type: BlockType
  content: string
  meta?: { checked?: boolean; language?: string }
}

interface YuqueEditorProps {
  initialTitle?: string
  initialContent?: string
  onSave?: (data: { title: string; content: string }) => void
  onDirtyChange?: (isDirty: boolean) => void
}

const generateId = () => Math.random().toString(36).slice(2, 9)

export function YuqueEditor({ 
  initialTitle = '', 
  initialContent = '',
  onSave,
  onDirtyChange,
}: YuqueEditorProps) {
  const { settings } = useSettingsStore()
  const autoSaveInterval = settings.general.autoSaveInterval
  
  const [title, setTitle] = useState(initialTitle)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isEditMode, setIsEditMode] = useState(true)
  const [formatCommand, setFormatCommand] = useState<{ type: string; wrapper?: string } | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 通知父组件 dirty 状态变化
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])
  
  // 标记为已修改
  const markDirty = useCallback(() => {
    setIsDirty(true)
  }, [])
  
  // 初始化内容
  useEffect(() => {
    setTitle(initialTitle)
    if (initialContent) {
      const lines = initialContent.split('\n').filter(l => l.trim())
      const parsed: Block[] = lines.map(line => {
        const id = generateId()
        const trimmed = line.trim()
        if (trimmed.startsWith('# ')) return { id, type: 'heading1', content: trimmed.slice(2) }
        if (trimmed.startsWith('## ')) return { id, type: 'heading2', content: trimmed.slice(3) }
        if (trimmed.startsWith('### ')) return { id, type: 'heading3', content: trimmed.slice(4) }
        if (trimmed.startsWith('- [ ] ')) return { id, type: 'todo', content: trimmed.slice(6), meta: { checked: false } }
        if (trimmed.startsWith('- [x] ')) return { id, type: 'todo', content: trimmed.slice(6), meta: { checked: true } }
        if (trimmed.startsWith('- ')) return { id, type: 'bullet', content: trimmed.slice(2) }
        if (/^\d+\.\s/.test(trimmed)) return { id, type: 'ordered', content: trimmed.replace(/^\d+\.\s/, '') }
        if (trimmed.startsWith('> ')) return { id, type: 'quote', content: trimmed.slice(2) }
        if (trimmed === '---') return { id, type: 'divider', content: '' }
        return { id, type: 'paragraph', content: trimmed }
      })
      setBlocks(parsed.length > 0 ? parsed : [{ id: generateId(), type: 'paragraph', content: '' }])
    } else {
      setBlocks([{ id: generateId(), type: 'paragraph', content: '' }])
    }
    setIsDirty(false)
  }, [initialContent, initialTitle])
  
  // 序列化内容
  const serializeContent = useCallback(() => {
    return blocks.map(b => {
      switch (b.type) {
        case 'heading1': return `# ${b.content}`
        case 'heading2': return `## ${b.content}`
        case 'heading3': return `### ${b.content}`
        case 'bullet': return `- ${b.content}`
        case 'ordered': return `1. ${b.content}`
        case 'todo': return `- [${b.meta?.checked ? 'x' : ' '}] ${b.content}`
        case 'quote': return `> ${b.content}`
        case 'code': return `\`\`\`${b.meta?.language || ''}\n${b.content}\n\`\`\``
        case 'divider': return '---'
        default: return b.content
      }
    }).join('\n\n')
  }, [blocks])
  
  // 执行保存
  const handleSave = useCallback(() => {
    if (!onSave) return
    onSave({ title, content: serializeContent() })
    setIsDirty(false)
  }, [onSave, title, serializeContent])
  
  // 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])
  
  // 自动保存
  useEffect(() => {
    if (autoSaveInterval === 0 || !onSave || !isDirty) return
    const timer = setTimeout(() => {
      handleSave()
    }, autoSaveInterval * 1000)
    return () => clearTimeout(timer)
  }, [autoSaveInterval, handleSave, onSave, isDirty])
  
  // 更新块内容
  const updateBlock = (id: string, content: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b))
    setIsDirty(true)
  }
  
  // 添加新块
  const addBlock = (afterId: string) => {
    const newBlock: Block = { id: generateId(), type: 'paragraph', content: '' }
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === afterId)
      const newBlocks = [...prev.slice(0, index + 1), newBlock, ...prev.slice(index + 1)]
      setTimeout(() => setActiveId(newBlock.id), 0)
      return newBlocks
    })
    setIsDirty(true)
  }
  
  // 删除块
  const deleteBlock = (id: string) => {
    setBlocks(prev => {
      if (prev.length <= 1) return prev
      const index = prev.findIndex(b => b.id === id)
      const newBlocks = prev.filter(b => b.id !== id)
      if (index > 0) {
        setTimeout(() => setActiveId(prev[index - 1].id), 0)
      }
      return newBlocks
    })
    setIsDirty(true)
  }
  
  // 转换块类型
  const convertBlock = (id: string, type: BlockType) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== id) return b
      const newBlock: Block = { ...b, type }
      if (type === 'todo' && !b.meta?.checked !== undefined) {
        newBlock.meta = { checked: false }
      }
      if (type === 'code' && !b.meta?.language) {
        newBlock.meta = { language: 'javascript' }
      }
      return newBlock
    }))
    setIsDirty(true)
  }
  
  // 转换当前活动块
  const convertActiveBlock = (type: BlockType) => {
    if (!activeId) return
    convertBlock(activeId, type)
  }
  
  // 聚焦到上一个块
  const focusPrevBlock = () => {
    if (!activeId) return
    const index = blocks.findIndex(b => b.id === activeId)
    if (index > 0) {
      setActiveId(blocks[index - 1].id)
    }
  }
  
  // 聚焦到下一个块
  const focusNextBlock = () => {
    if (!activeId) return
    const index = blocks.findIndex(b => b.id === activeId)
    if (index < blocks.length - 1) {
      setActiveId(blocks[index + 1].id)
    }
  }
  
  // 包装选中内容（用于加粗、斜体等）
  const wrapSelection = (wrapper: string) => {
    if (!activeId) return
    const block = blocks.find(b => b.id === activeId)
    if (!block) return
    const newContent = `${wrapper}${block.content}${wrapper}`
    updateBlock(activeId, newContent)
  }
  
  // 添加分割线
  const addDivider = () => {
    if (!activeId) return
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === activeId)
      const divider: Block = { id: generateId(), type: 'divider', content: '' }
      const newBlocks = [...prev.slice(0, index + 1), divider, ...prev.slice(index + 1)]
      return newBlocks
    })
    setIsDirty(true)
  }
  
  // 插入链接
  const insertLink = () => {
    if (!activeId) return
    const url = prompt('请输入链接地址:')
    if (!url) return
    const block = blocks.find(b => b.id === activeId)
    if (!block) return
    const text = block.content || '链接'
    updateBlock(activeId, `[${text}](${url})`)
  }
  
  // 插入图片
  const insertImage = () => {
    if (!activeId) return
    const url = prompt('请输入图片地址:')
    if (!url) return
    updateBlock(activeId, `![](${url})`)
  }
  
  // 插入表格
  const insertTable = () => {
    if (!activeId) return
    const tableMarkdown = '| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 内容 | 内容 | 内容 |'
    updateBlock(activeId, tableMarkdown)
  }
  
  // 斜杠命令菜单项
  const slashCommands = [
    { type: 'heading1' as BlockType, label: '标题 1', icon: Heading1, desc: '大标题' },
    { type: 'heading2' as BlockType, label: '标题 2', icon: Heading2, desc: '中标题' },
    { type: 'heading3' as BlockType, label: '标题 3', icon: Heading3, desc: '小标题' },
    { type: 'bullet' as BlockType, label: '无序列表', icon: List, desc: '项目符号列表' },
    { type: 'ordered' as BlockType, label: '有序列表', icon: ListOrdered, desc: '编号列表' },
    { type: 'todo' as BlockType, label: '任务列表', icon: CheckSquare, desc: '带复选框的列表' },
    { type: 'quote' as BlockType, label: '引用', icon: Quote, desc: '引用文本' },
    { type: 'code' as BlockType, label: '代码块', icon: Code, desc: '代码片段' },
    { type: 'divider' as BlockType, label: '分割线', icon: Minus, desc: '分隔线' },
  ]
  
  return (
    <div ref={containerRef} className="h-full flex flex-col bg-background">
      {/* 工具栏 */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/30 overflow-x-auto">
        <ToolbarGroup>
          <ToolbarButton icon={Bold} title="加粗" onClick={() => setFormatCommand({ type: 'wrap', wrapper: '**' })} />
          <ToolbarButton icon={Italic} title="斜体" onClick={() => setFormatCommand({ type: 'wrap', wrapper: '*' })} />
          <ToolbarButton icon={Underline} title="下划线" onClick={() => setFormatCommand({ type: 'wrap', wrapper: '__' })} />
          <ToolbarButton icon={Strikethrough} title="删除线" onClick={() => setFormatCommand({ type: 'wrap', wrapper: '~~' })} />
        </ToolbarGroup>
        
        <ToolbarGroup>
          <ToolbarButton icon={Heading1} title="标题 1" onClick={() => convertActiveBlock('heading1')} />
          <ToolbarButton icon={Heading2} title="标题 2" onClick={() => convertActiveBlock('heading2')} />
          <ToolbarButton icon={Heading3} title="标题 3" onClick={() => convertActiveBlock('heading3')} />
        </ToolbarGroup>
        
        <ToolbarGroup>
          <ToolbarButton icon={List} title="无序列表" onClick={() => convertActiveBlock('bullet')} />
          <ToolbarButton icon={ListOrdered} title="有序列表" onClick={() => convertActiveBlock('ordered')} />
          <ToolbarButton icon={CheckSquare} title="任务列表" onClick={() => convertActiveBlock('todo')} />
        </ToolbarGroup>
        
        <ToolbarGroup>
          <ToolbarButton icon={Quote} title="引用" onClick={() => convertActiveBlock('quote')} />
          <ToolbarButton icon={Code} title="代码块" onClick={() => convertActiveBlock('code')} />
          <ToolbarButton icon={Minus} title="分割线" onClick={() => addDivider()} />
        </ToolbarGroup>
        
        <ToolbarGroup>
          <ToolbarButton icon={Link} title="链接" onClick={() => insertLink()} />
          <ToolbarButton icon={Image} title="图片" onClick={() => insertImage()} />
          <ToolbarButton icon={Table} title="表格" onClick={() => insertTable()} />
        </ToolbarGroup>
        
        <div className="flex-1" />
        
        {/* 编辑/阅读模式切换 */}
        <ToolbarGroup>
          <ToolbarButton 
            icon={isEditMode ? Eye : Edit3} 
            title={isEditMode ? "阅读模式" : "编辑模式"} 
            onClick={() => setIsEditMode(!isEditMode)} 
          />
        </ToolbarGroup>
      </div>
      
      {/* 编辑器主体 */}
      <div className="flex-1 overflow-y-auto py-8 px-4 bg-background">
        <div className="max-w-3xl mx-auto">
          {/* 标题 */}
          <div className="mb-6">
            {isEditMode ? (
              <textarea
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setIsDirty(true)
                }}
                placeholder="无标题文档"
                className={cn(
                  "w-full text-4xl font-bold text-foreground",
                  "bg-background border-0 outline-none resize-none",
                  "placeholder:text-muted-foreground/50"
                )}
                rows={1}
                style={{ minHeight: '56px' }}
              />
            ) : (
              <h1 className="text-4xl font-bold text-foreground">
                {title || '无标题文档'}
              </h1>
            )}
          </div>
          
          {/* 内容块 */}
          <div className="space-y-1">
            {blocks.map((block, index) => (
              <ContentBlock
                key={block.id}
                block={block}
                isActive={activeId === block.id}
                isEditMode={isEditMode}
                formatCommand={formatCommand}
                onUpdate={(content) => updateBlock(block.id, content)}
                onFocus={() => setActiveId(block.id)}
                onAddBelow={() => addBlock(block.id)}
                onDelete={() => deleteBlock(block.id)}
                onConvert={(type) => convertBlock(block.id, type)}
                onFocusPrev={index > 0 ? focusPrevBlock : undefined}
                onFocusNext={index < blocks.length - 1 ? focusNextBlock : undefined}
                onFormatDone={() => setFormatCommand(null)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// 工具栏组件
function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 px-1 border-r border-border last:border-0">
      {children}
    </div>
  )
}

function ToolbarButton({ 
  icon: Icon, 
  onClick, 
  title 
}: { 
  icon: any
  onClick: () => void 
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-2 rounded-lg transition-all",
        "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

// 斜杠命令项
const slashCommandItems = [
  { type: 'heading1' as BlockType, label: '标题 1', icon: Heading1, desc: '大标题' },
  { type: 'heading2' as BlockType, label: '标题 2', icon: Heading2, desc: '中标题' },
  { type: 'heading3' as BlockType, label: '标题 3', icon: Heading3, desc: '小标题' },
  { type: 'bullet' as BlockType, label: '无序列表', icon: List, desc: '项目符号列表' },
  { type: 'ordered' as BlockType, label: '有序列表', icon: ListOrdered, desc: '编号列表' },
  { type: 'todo' as BlockType, label: '任务列表', icon: CheckSquare, desc: '带复选框的列表' },
  { type: 'quote' as BlockType, label: '引用', icon: Quote, desc: '引用文本' },
  { type: 'code' as BlockType, label: '代码块', icon: Code, desc: '代码片段' },
  { type: 'divider' as BlockType, label: '分割线', icon: Minus, desc: '分隔线' },
]

// 内容块组件
const ContentBlock = ({
  block,
  isActive,
  isEditMode,
  formatCommand,
  onUpdate,
  onFocus,
  onAddBelow,
  onDelete,
  onConvert,
  onFocusPrev,
  onFocusNext,
  onFormatDone
}: {
  block: Block
  isActive: boolean
  isEditMode: boolean
  formatCommand: { type: string; wrapper?: string } | null
  onUpdate: (content: string) => void
  onFocus: () => void
  onAddBelow: () => void
  onDelete: () => void
  onConvert?: (type: BlockType) => void
  onFocusPrev?: () => void
  onFocusNext?: () => void
  onFormatDone: () => void
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [localContent, setLocalContent] = useState(block.content)
  const [showMenu, setShowMenu] = useState(false)
  const [menuIndex, setMenuIndex] = useState(0)
  
  // 自动聚焦当块变为活动状态时
  useEffect(() => {
    if (isActive && textareaRef.current) {
      textareaRef.current.focus()
      // 聚焦到内容末尾
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [isActive])
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [localContent])
  
  // 同步 block.content 到 localContent（初始化和内容变化时）
  useEffect(() => {
    setLocalContent(block.content)
  }, [block.id, block.content])
  
  // 处理格式化命令
  useEffect(() => {
    if (!formatCommand || !isActive || !textareaRef.current) return
    
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const content = localContent
    
    if (formatCommand.type === 'wrap' && formatCommand.wrapper) {
      const wrapper = formatCommand.wrapper
      const before = content.substring(0, start)
      const selected = content.substring(start, end)
      const after = content.substring(end)
      
      // 如果有选中文本，只包裹选中的部分；否则包裹全部
      const newContent = selected 
        ? `${before}${wrapper}${selected}${wrapper}${after}`
        : `${wrapper}${content}${wrapper}`
      
      setLocalContent(newContent)
      onUpdate(newContent)
      
      // 恢复光标位置
      setTimeout(() => {
        const newCursorPos = selected 
          ? start + wrapper.length + selected.length + wrapper.length
          : wrapper.length + content.length + wrapper.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.focus()
      }, 0)
    }
    
    onFormatDone()
  }, [formatCommand, isActive, localContent, onUpdate, onFormatDone])
  
  // 点击外部关闭菜单
  useEffect(() => {
    if (!showMenu) return
    const handleClick = (e: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [showMenu])
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setLocalContent(value)
    onUpdate(value)
    
    // 检测是否输入了 "/"
    if (value === '/' || value.endsWith(' /')) {
      setShowMenu(true)
      setMenuIndex(0)
    } else if (showMenu && !value.includes('/')) {
      setShowMenu(false)
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMenu) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowMenu(false)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMenuIndex(i => (i + 1) % slashCommandItems.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMenuIndex(i => (i - 1 + slashCommandItems.length) % slashCommandItems.length)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = slashCommandItems[menuIndex]
        if (item && onConvert) {
          // 清除 "/" 并转换块类型
          const newContent = localContent.replace(/\/?$/, '').trim()
          setLocalContent(newContent)
          onUpdate(newContent)
          onConvert(item.type)
        }
        setShowMenu(false)
        return
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onAddBelow()
    } else if (e.key === 'Backspace' && localContent === '') {
      e.preventDefault()
      onDelete()
    } else if (e.key === 'ArrowUp') {
      // 如果光标在第一行，跳到上一个块
      const textarea = e.currentTarget as HTMLTextAreaElement
      const cursorPosition = textarea.selectionStart
      const textBeforeCursor = textarea.value.substring(0, cursorPosition)
      const lineBreaksBefore = textBeforeCursor.split('\n').length - 1
      if (lineBreaksBefore === 0) {
        e.preventDefault()
        onFocusPrev?.()
      }
    } else if (e.key === 'ArrowDown') {
      // 如果光标在最后一行，跳到下一个块
      const textarea = e.currentTarget as HTMLTextAreaElement
      const cursorPosition = textarea.selectionStart
      const textAfterCursor = textarea.value.substring(cursorPosition)
      const lineBreaksAfter = textAfterCursor.split('\n').length - 1
      if (lineBreaksAfter === 0) {
        e.preventDefault()
        onFocusNext?.()
      }
    }
  }
  
  const getClassName = () => {
    const base = cn(
      "w-full bg-background border-0 outline-none resize-none",
      "text-foreground placeholder:text-muted-foreground/50"
    )
    switch (block.type) {
      case 'heading1': return cn(base, "text-3xl font-bold mt-4")
      case 'heading2': return cn(base, "text-2xl font-semibold mt-3")
      case 'heading3': return cn(base, "text-xl font-semibold mt-2")
      case 'quote': return cn(base, "border-l-4 border-primary/30 pl-4 italic text-muted-foreground")
      case 'code': return cn(base, "font-mono text-sm bg-muted p-3 rounded-lg")
      default: return cn(base, "text-base leading-relaxed py-1")
    }
  }
  
  const getPlaceholder = () => {
    switch (block.type) {
      case 'heading1': return '标题 1'
      case 'heading2': return '标题 2'
      case 'heading3': return '标题 3'
      case 'bullet': return '列表项'
      case 'ordered': return '列表项'
      case 'todo': return '任务项'
      case 'quote': return '引用内容'
      case 'code': return '代码...'
      default: return '输入内容...'
    }
  }
  
  if (block.type === 'divider') {
    return <hr className="my-4 border-border" />
  }
  
  // 阅读模式：渲染静态内容
  if (!isEditMode) {
    const renderContent = () => {
      const baseClass = "text-foreground"
      switch (block.type) {
        case 'heading1': return <h1 className={cn(baseClass, "text-3xl font-bold mt-4")}>{block.content}</h1>
        case 'heading2': return <h2 className={cn(baseClass, "text-2xl font-semibold mt-3")}>{block.content}</h2>
        case 'heading3': return <h3 className={cn(baseClass, "text-xl font-semibold mt-2")}>{block.content}</h3>
        case 'bullet': return <div className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground flex-shrink-0" /><span>{block.content}</span></div>
        case 'ordered': return <div className="flex items-start gap-2"><span className="text-muted-foreground flex-shrink-0 w-5">1.</span><span>{block.content}</span></div>
        case 'todo': return <div className="flex items-start gap-2"><input type="checkbox" checked={block.meta?.checked} readOnly className="mt-1 flex-shrink-0" /><span className={block.meta?.checked ? 'line-through text-muted-foreground' : ''}>{block.content}</span></div>
        case 'quote': return <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground">{block.content}</blockquote>
        case 'code': return <pre className="font-mono text-sm bg-muted p-3 rounded-lg overflow-x-auto"><code>{block.content}</code></pre>
        default: return <p className={cn(baseClass, "text-base leading-relaxed py-1")}>{block.content}</p>
      }
    }
    
    return <div className="py-0.5">{renderContent()}</div>
  }
  
  // 编辑模式：显示可编辑的 textarea
  return (
    <div className="relative py-0.5">
      <textarea
        ref={textareaRef}
        value={localContent}
        onChange={handleChange}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        className={getClassName()}
        placeholder={getPlaceholder()}
        rows={1}
      />
      
      {/* 斜杠命令菜单 */}
      {showMenu && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-popover border border-border rounded-lg shadow-lg py-1">
          <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border mb-1">
            基本块
          </div>
          {slashCommandItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={item.type}
                onClick={() => {
                  if (onConvert) {
                    const newContent = localContent.replace(/\/?$/, '').trim()
                    setLocalContent(newContent)
                    onUpdate(newContent)
                    onConvert(item.type)
                  }
                  setShowMenu(false)
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                  index === menuIndex ? "bg-accent" : "hover:bg-accent/50"
                )}
              >
                <Icon className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
