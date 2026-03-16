import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../utils/cn'
import {
  Bold, Italic, Underline, Strikethrough, Code, Link, Image as ImageIcon,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote,
  Table, Minus, Type, AlignLeft, AlignCenter, AlignRight, Plus, Trash2,
  GripVertical, Undo2, Redo2
} from 'lucide-react'

type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bulletList' | 'orderedList' | 'taskList' | 'quote' | 'code' | 'divider'

interface Block {
  id: string
  type: BlockType
  content: string
  meta?: { checked?: boolean; language?: string }
}

const blockConfig: Record<BlockType, { label: string; placeholder: string }> = {
  paragraph: { label: '文本', placeholder: '输入内容...' },
  heading1: { label: '标题1', placeholder: '标题 1' },
  heading2: { label: '标题2', placeholder: '标题 2' },
  heading3: { label: '标题3', placeholder: '标题 3' },
  bulletList: { label: '无序列表', placeholder: '列表项' },
  orderedList: { label: '有序列表', placeholder: '列表项' },
  taskList: { label: '任务列表', placeholder: '任务项' },
  quote: { label: '引用', placeholder: '引用内容...' },
  code: { label: '代码块', placeholder: '// 代码' },
  divider: { label: '分割线', placeholder: '' }
}

const generateId = () => Math.random().toString(36).substring(2, 9)

// ===== 工具栏按钮 =====
function ToolbarButton({ icon: Icon, active, onClick, title }: { icon: any; active?: boolean; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded hover:bg-accent transition-colors",
        active ? "bg-accent text-foreground" : "text-muted-foreground"
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

// ===== 块渲染组件 =====
function BlockComponent({
  block, isActive, onChange, onFocus, onBlur, onDelete, onAddBelow
}: {
  block: Block
  isActive: boolean
  onChange: (content: string) => void
  onFocus: () => void
  onBlur: () => void
  onDelete: () => void
  onAddBelow: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isEmpty, setIsEmpty] = useState(!block.content)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.focus()
    }
  }, [isActive])

  const handleInput = () => {
    if (!ref.current) return
    const text = ref.current.innerText
    setIsEmpty(!text || text === '\n')
    onChange(ref.current.innerHTML)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onAddBelow()
    } else if (e.key === 'Backspace' && isEmpty) {
      e.preventDefault()
      onDelete()
    }
  }

  const handleSlashCommand = (type: BlockType) => {
    setShowMenu(false)
    // 转换块类型
    if (ref.current) {
      ref.current.innerHTML = ''
      onChange('')
    }
    // 通知父组件转换类型
  }

  const renderContent = () => {
    const props = {
      ref,
      contentEditable: true,
      suppressContentEditableWarning: true,
      onInput: handleInput,
      onFocus,
      onBlur,
      onKeyDown: handleKeyDown,
      className: cn(
        "outline-none min-h-[1.5em] py-1",
        "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/30 empty:before:pointer-events-none"
      ),
      'data-placeholder': blockConfig[block.type].placeholder,
      dangerouslySetInnerHTML: { __html: block.content }
    }

    switch (block.type) {
      case 'heading1':
        return <h1 {...props} className={cn(props.className, "text-3xl font-bold mt-6 mb-4")} />
      case 'heading2':
        return <h2 {...props} className={cn(props.className, "text-2xl font-semibold mt-5 mb-3")} />
      case 'heading3':
        return <h3 {...props} className={cn(props.className, "text-xl font-semibold mt-4 mb-2")} />
      case 'bulletList':
        return (
          <div className="flex items-start gap-2 my-1">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground/60 flex-shrink-0" />
            <div {...props} className={cn(props.className, "flex-1")} />
          </div>
        )
      case 'orderedList':
        return (
          <div className="flex items-start gap-2 my-1">
            <span className="mt-1 text-sm text-foreground/60 font-medium min-w-[1.5em]">1.</span>
            <div {...props} className={cn(props.className, "flex-1")} />
          </div>
        )
      case 'taskList':
        return (
          <div className="flex items-start gap-2 my-1">
            <input
              type="checkbox"
              checked={block.meta?.checked}
              onChange={(e) => block.meta = { ...block.meta, checked: e.target.checked }}
              className="mt-1.5 w-4 h-4 rounded border-border flex-shrink-0"
            />
            <div {...props} className={cn(props.className, "flex-1")} />
          </div>
        )
      case 'quote':
        return (
          <blockquote className="border-l-4 border-primary/30 pl-4 my-4">
            <div {...props} />
          </blockquote>
        )
      case 'code':
        return (
          <div className="my-4 bg-muted rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/80 border-b text-xs text-muted-foreground">
              <select className="bg-transparent outline-none">
                <option>plaintext</option>
                <option>javascript</option>
                <option>typescript</option>
                <option>python</option>
              </select>
            </div>
            <pre className="p-4">
              <code {...props} className={cn(props.className, "font-mono text-sm")} />
            </pre>
          </div>
        )
      case 'divider':
        return <hr className="my-6 border-border" />
      default:
        return <div {...props} className={cn(props.className, "text-base leading-relaxed my-1")} />
    }
  }

  return (
    <div
      className={cn(
        "group relative flex items-start gap-1 py-0.5 -mx-2 px-2 rounded-lg transition-colors",
        isActive && "bg-accent/20"
      )}
    >
      {/* 左侧操作区 - 更隐蔽，只有hover且为空时才显示 */}
      <div className={cn(
        "absolute -left-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-opacity",
        isEmpty ? "opacity-0 group-hover:opacity-100" : "opacity-0 group-hover:opacity-0"
      )}>
        <button
          onClick={(e) => { e.stopPropagation(); onAddBelow() }}
          className="p-0.5 hover:bg-accent rounded text-muted-foreground/60 hover:text-muted-foreground"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 min-w-0">
        {renderContent()}
      </div>

      {/* 右侧操作按钮 - 悬浮显示 */}
      <div className={cn(
        "absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 transition-opacity",
        isActive && "opacity-100"
      )}>
        <button
          onClick={onAddBelow}
          className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
          title="下方添加"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
          title="删除"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ===== 主编辑器组件 =====
export function YuqueBlockEditor({ content, onChange }: { content?: string; onChange?: (content: string) => void }) {
  const [blocks, setBlocks] = useState<Block[]>([
    { id: generateId(), type: 'paragraph', content: '' }
  ])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [history, setHistory] = useState<Block[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // 初始化
  useEffect(() => {
    if (content) {
      const lines = content.split('\n').filter(l => l.trim())
      if (lines.length > 0) {
        const parsed: Block[] = lines.map(line => {
          const id = generateId()
          if (line.startsWith('# ')) return { id, type: 'heading1', content: line.slice(2) }
          if (line.startsWith('## ')) return { id, type: 'heading2', content: line.slice(3) }
          if (line.startsWith('### ')) return { id, type: 'heading3', content: line.slice(4) }
          if (line.startsWith('- [ ] ')) return { id, type: 'taskList', content: line.slice(6), meta: { checked: false } }
          if (line.startsWith('- ')) return { id, type: 'bulletList', content: line.slice(2) }
          if (line.startsWith('> ')) return { id, type: 'quote', content: line.slice(2) }
          return { id, type: 'paragraph', content: line }
        })
        setBlocks(parsed)
      }
    }
  }, [])

  // 保存历史
  const saveHistory = (newBlocks: Block[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newBlocks)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // 撤销
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setBlocks(history[historyIndex - 1])
    }
  }

  // 重做
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setBlocks(history[historyIndex + 1])
    }
  }

  // 序列化并通知父组件
  useEffect(() => {
    const markdown = blocks.map(b => {
      switch (b.type) {
        case 'heading1': return `# ${b.content}`
        case 'heading2': return `## ${b.content}`
        case 'heading3': return `### ${b.content}`
        case 'bulletList': return `- ${b.content}`
        case 'orderedList': return `1. ${b.content}`
        case 'taskList': return `- [${b.meta?.checked ? 'x' : ' '}] ${b.content}`
        case 'quote': return `> ${b.content}`
        default: return b.content
      }
    }).join('\n\n')
    onChange?.(markdown)
  }, [blocks])

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
  }

  const deleteBlock = (id: string) => {
    const index = blocks.findIndex(b => b.id === id)
    if (blocks.length <= 1) {
      setBlocks([{ id: generateId(), type: 'paragraph', content: '' }])
      return
    }
    setBlocks(prev => prev.filter(b => b.id !== id))
    if (index > 0) {
      setActiveId(blocks[index - 1].id)
    }
  }

  const addBlock = (afterId: string, type: BlockType = 'paragraph') => {
    const index = blocks.findIndex(b => b.id === afterId)
    const newBlock: Block = { id: generateId(), type, content: '' }
    setBlocks(prev => [
      ...prev.slice(0, index + 1),
      newBlock,
      ...prev.slice(index + 1)
    ])
    setActiveId(newBlock.id)
  }

  const convertBlock = (id: string, type: BlockType) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, type, content: '' } : b))
  }

  // 工具栏命令
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 顶部工具栏 */}
      <div className="h-12 border-b border-border flex items-center gap-1 px-4 bg-muted/30">
        <div className="flex items-center gap-0.5">
          <ToolbarButton icon={Undo2} onClick={undo} title="撤销" />
          <ToolbarButton icon={Redo2} onClick={redo} title="重做" />
        </div>
        <div className="w-px h-5 bg-border mx-2" />
        <div className="flex items-center gap-0.5">
          <ToolbarButton icon={Bold} onClick={() => execCommand('bold')} title="粗体" />
          <ToolbarButton icon={Italic} onClick={() => execCommand('italic')} title="斜体" />
          <ToolbarButton icon={Underline} onClick={() => execCommand('underline')} title="下划线" />
          <ToolbarButton icon={Strikethrough} onClick={() => execCommand('strikeThrough')} title="删除线" />
          <ToolbarButton icon={Code} onClick={() => execCommand('code')} title="行内代码" />
        </div>
        <div className="w-px h-5 bg-border mx-2" />
        <div className="flex items-center gap-0.5">
          <ToolbarButton icon={Heading1} onClick={() => activeId && convertBlock(activeId, 'heading1')} title="标题1" />
          <ToolbarButton icon={Heading2} onClick={() => activeId && convertBlock(activeId, 'heading2')} title="标题2" />
          <ToolbarButton icon={Heading3} onClick={() => activeId && convertBlock(activeId, 'heading3')} title="标题3" />
        </div>
        <div className="w-px h-5 bg-border mx-2" />
        <div className="flex items-center gap-0.5">
          <ToolbarButton icon={List} onClick={() => activeId && convertBlock(activeId, 'bulletList')} title="无序列表" />
          <ToolbarButton icon={ListOrdered} onClick={() => activeId && convertBlock(activeId, 'orderedList')} title="有序列表" />
          <ToolbarButton icon={CheckSquare} onClick={() => activeId && convertBlock(activeId, 'taskList')} title="任务列表" />
          <ToolbarButton icon={Quote} onClick={() => activeId && convertBlock(activeId, 'quote')} title="引用" />
          <ToolbarButton icon={Code} onClick={() => activeId && convertBlock(activeId, 'code')} title="代码块" />
          <ToolbarButton icon={Minus} onClick={() => activeId && convertBlock(activeId, 'divider')} title="分割线" />
        </div>
      </div>

      {/* 编辑区 */}
      <div className="flex-1 overflow-y-auto py-8 px-8">
        <div className="max-w-3xl mx-auto space-y-1">
          {blocks.map((block) => (
            <BlockComponent
              key={block.id}
              block={block}
              isActive={activeId === block.id}
              onChange={(content) => updateBlock(block.id, { content })}
              onFocus={() => setActiveId(block.id)}
              onBlur={() => setActiveId(null)}
              onDelete={() => deleteBlock(block.id)}
              onAddBelow={() => addBlock(block.id, 'paragraph')}
            />
          ))}
        </div>
        <div className="h-32" />
      </div>
    </div>
  )
}
