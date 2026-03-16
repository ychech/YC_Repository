import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '../../utils/cn'
import { 
  Plus, Trash2, GripVertical,
  Heading1, Heading2, Heading3, List, ListOrdered, 
  CheckSquare, Quote, Code, Minus
} from 'lucide-react'

type BlockType = 'text' | 'h1' | 'h2' | 'h3' | 'bullet' | 'number' | 'todo' | 'quote' | 'code' | 'divider'

interface Block {
  id: string
  type: BlockType
  content: string
  meta?: { checked?: boolean }
}

const typeConfig: Record<BlockType, { label: string; placeholder: string; icon: any }> = {
  text: { label: '文本', placeholder: '输入文本...', icon: null },
  h1: { label: '标题1', placeholder: '标题 1', icon: Heading1 },
  h2: { label: '标题2', placeholder: '标题 2', icon: Heading2 },
  h3: { label: '标题3', placeholder: '标题 3', icon: Heading3 },
  bullet: { label: '列表', placeholder: '列表项', icon: List },
  number: { label: '编号', placeholder: '列表项', icon: ListOrdered },
  todo: { label: '待办', placeholder: '待办事项', icon: CheckSquare },
  quote: { label: '引用', placeholder: '引用内容', icon: Quote },
  code: { label: '代码', placeholder: '代码...', icon: Code },
  divider: { label: '分割线', placeholder: '', icon: Minus }
}

const generateId = () => Math.random().toString(36).slice(2, 9)

// 单个块组件
function BlockItem({
  block,
  isActive,
  onChange,
  onFocus,
  onAddBelow,
  onDelete,
  onConvert
}: {
  block: Block
  isActive: boolean
  onChange: (content: string) => void
  onFocus: () => void
  onAddBelow: (type?: BlockType) => void
  onDelete: () => void
  onConvert: (type: BlockType) => void
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [showToolbar, setShowToolbar] = useState(false)
  const [isComposing, setIsComposing] = useState(false)

  // 仅在初始化时设置内容，不响应后续 content 变化避免光标问题
  useEffect(() => {
    if (contentRef.current && !isActive) {
      contentRef.current.innerText = block.content
    }
  }, [block.id])

  const handleInput = useCallback(() => {
    if (isComposing) return
    const text = contentRef.current?.innerText || ''
    onChange(text)
  }, [isComposing, onChange])

  const handleCompositionStart = () => setIsComposing(true)
  
  const handleCompositionEnd = () => {
    setIsComposing(false)
    const text = contentRef.current?.innerText || ''
    onChange(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const text = contentRef.current?.innerText || ''
    
    // Enter 创建新块
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (text.trim() === '') {
        // 空块直接删除或转换
        return
      }
      onAddBelow('text')
      return
    }
    
    // Backspace 删除空块
    if (e.key === 'Backspace' && text === '') {
      e.preventDefault()
      onDelete()
      return
    }
    
    // Markdown 快捷语法
    if (text === '# ' && e.key === ' ') {
      e.preventDefault()
      onConvert('h1')
      return
    }
    if (text === '## ' && e.key === ' ') {
      e.preventDefault()
      onConvert('h2')
      return
    }
    if (text === '- ' && e.key === ' ') {
      e.preventDefault()
      onConvert('bullet')
      return
    }
    if (text === '/divider') {
      onConvert('divider')
      return
    }
  }

  const renderBlock = () => {
    const baseClass = cn(
      "outline-none py-1 px-1 -mx-1 rounded",
      "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/30",
      isActive && "bg-accent/20"
    )
    
    const placeholder = typeConfig[block.type].placeholder
    
    switch (block.type) {
      case 'h1':
        return (
          <h1 
            ref={contentRef as any}
            contentEditable
            suppressContentEditableWarning
            className={cn(baseClass, "text-3xl font-bold mt-4 mb-2")}
            data-placeholder={placeholder}
            onInput={handleInput}
            onFocus={onFocus}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onKeyDown={handleKeyDown}
          >
            {block.content}
          </h1>
        )
      case 'h2':
        return (
          <h2 
            ref={contentRef as any}
            contentEditable
            suppressContentEditableWarning
            className={cn(baseClass, "text-2xl font-semibold mt-3 mb-2")}
            data-placeholder={placeholder}
            onInput={handleInput}
            onFocus={onFocus}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onKeyDown={handleKeyDown}
          >
            {block.content}
          </h2>
        )
      case 'h3':
        return (
          <h3 
            ref={contentRef as any}
            contentEditable
            suppressContentEditableWarning
            className={cn(baseClass, "text-xl font-semibold mt-2 mb-1")}
            data-placeholder={placeholder}
            onInput={handleInput}
            onFocus={onFocus}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onKeyDown={handleKeyDown}
          >
            {block.content}
          </h3>
        )
      case 'bullet':
        return (
          <div className="flex items-start gap-2">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground/60 flex-shrink-0" />
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              className={cn(baseClass, "flex-1")}
              data-placeholder={placeholder}
              onInput={handleInput}
              onFocus={onFocus}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onKeyDown={handleKeyDown}
            >
              {block.content}
            </div>
          </div>
        )
      case 'number':
        return (
          <div className="flex items-start gap-2">
            <span className="mt-1 text-sm text-foreground/60 min-w-[1.5em]">1.</span>
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              className={cn(baseClass, "flex-1")}
              data-placeholder={placeholder}
              onInput={handleInput}
              onFocus={onFocus}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onKeyDown={handleKeyDown}
            >
              {block.content}
            </div>
          </div>
        )
      case 'todo':
        return (
          <div className="flex items-start gap-2">
            <input 
              type="checkbox" 
              className="mt-1.5 w-4 h-4 rounded flex-shrink-0"
              checked={block.meta?.checked}
              onChange={(e) => {
                block.meta = { ...block.meta, checked: e.target.checked }
              }}
            />
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              className={cn(baseClass, "flex-1")}
              data-placeholder={placeholder}
              onInput={handleInput}
              onFocus={onFocus}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onKeyDown={handleKeyDown}
            >
              {block.content}
            </div>
          </div>
        )
      case 'quote':
        return (
          <blockquote className="border-l-4 border-primary/30 pl-4 my-2">
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              className={baseClass}
              data-placeholder={placeholder}
              onInput={handleInput}
              onFocus={onFocus}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onKeyDown={handleKeyDown}
            >
              {block.content}
            </div>
          </blockquote>
        )
      case 'code':
        return (
          <div className="my-2 bg-muted rounded-lg p-3 font-mono text-sm">
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              className={baseClass}
              data-placeholder={placeholder}
              onInput={handleInput}
              onFocus={onFocus}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onKeyDown={handleKeyDown}
            >
              {block.content}
            </div>
          </div>
        )
      case 'divider':
        return <hr className="my-4 border-border" />
      default:
        return (
          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            className={cn(baseClass, "text-base leading-relaxed")}
            data-placeholder={placeholder}
            onInput={handleInput}
            onFocus={onFocus}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onKeyDown={handleKeyDown}
          >
            {block.content}
          </div>
        )
    }
  }

  return (
    <div 
      className="group relative flex items-start gap-1 py-0.5 -mx-2 px-2"
      onMouseEnter={() => setShowToolbar(true)}
      onMouseLeave={() => setShowToolbar(false)}
    >
      {/* 左侧 + 按钮 - 仅悬浮显示 */}
      <div className={cn(
        "w-6 flex items-center justify-center transition-opacity",
        showToolbar || isActive ? "opacity-100" : "opacity-0"
      )}>
        <button
          onClick={() => onAddBelow('text')}
          className="p-0.5 hover:bg-accent rounded text-muted-foreground/50 hover:text-muted-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 min-w-0">
        {renderBlock()}
      </div>

      {/* 右侧工具栏 - 悬浮显示 */}
      <div className={cn(
        "flex items-center gap-0.5 transition-opacity",
        showToolbar ? "opacity-100" : "opacity-0"
      )}>
        {/* 类型转换菜单 */}
        <select
          value={block.type}
          onChange={(e) => onConvert(e.target.value as BlockType)}
          className="text-xs bg-transparent border-none outline-none text-muted-foreground cursor-pointer"
        >
          <option value="text">文本</option>
          <option value="h1">标题1</option>
          <option value="h2">标题2</option>
          <option value="h3">标题3</option>
          <option value="bullet">列表</option>
          <option value="number">编号</option>
          <option value="todo">待办</option>
          <option value="quote">引用</option>
          <option value="code">代码</option>
          <option value="divider">分割线</option>
        </select>
        
        <button
          onClick={onDelete}
          className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ===== 主编辑器组件 =====
export function BlockEditor({ content, onChange }: { content?: string; onChange?: (content: string) => void }) {
  const [blocks, setBlocks] = useState<Block[]>([
    { id: generateId(), type: 'text', content: '' }
  ])
  const [activeId, setActiveId] = useState<string | null>(null)

  // 初始化解析内容
  useEffect(() => {
    if (content) {
      const lines = content.split('\n').filter(l => l.trim())
      if (lines.length > 0) {
        const parsed: Block[] = lines.map(line => {
          const id = generateId()
          if (line.startsWith('# ')) return { id, type: 'h1', content: line.slice(2) }
          if (line.startsWith('## ')) return { id, type: 'h2', content: line.slice(3) }
          if (line.startsWith('### ')) return { id, type: 'h3', content: line.slice(4) }
          if (line.startsWith('- [ ] ')) return { id, type: 'todo', content: line.slice(6), meta: { checked: false } }
          if (line.startsWith('- ')) return { id, type: 'bullet', content: line.slice(2) }
          if (line.startsWith('> ')) return { id, type: 'quote', content: line.slice(2) }
          if (line.startsWith('---')) return { id, type: 'divider', content: '' }
          if (line.startsWith('```')) return { id, type: 'code', content: line.slice(3) }
          return { id, type: 'text', content: line }
        })
        setBlocks(parsed)
      }
    }
  }, [])

  // 序列化内容
  useEffect(() => {
    const markdown = blocks.map(b => {
      switch (b.type) {
        case 'h1': return `# ${b.content}`
        case 'h2': return `## ${b.content}`
        case 'h3': return `### ${b.content}`
        case 'bullet': return `- ${b.content}`
        case 'number': return `1. ${b.content}`
        case 'todo': return `- [${b.meta?.checked ? 'x' : ' '}] ${b.content}`
        case 'quote': return `> ${b.content}`
        case 'code': return `\`\`\`\n${b.content}\n\`\`\``
        case 'divider': return '---'
        default: return b.content
      }
    }).join('\n\n')
    onChange?.(markdown)
  }, [blocks])

  const updateBlock = (id: string, content: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b))
  }

  const deleteBlock = (id: string) => {
    const index = blocks.findIndex(b => b.id === id)
    if (blocks.length <= 1) return
    
    setBlocks(prev => prev.filter(b => b.id !== id))
    if (index > 0) {
      setActiveId(blocks[index - 1].id)
    }
  }

  const addBlock = (afterId: string, type: BlockType = 'text') => {
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

  return (
    <div className="h-full overflow-y-auto py-8 px-12">
      <div className="max-w-3xl mx-auto space-y-1">
        {blocks.map((block) => (
          <BlockItem
            key={block.id}
            block={block}
            isActive={activeId === block.id}
            onChange={(content) => updateBlock(block.id, content)}
            onFocus={() => setActiveId(block.id)}
            onAddBelow={(type) => addBlock(block.id, type)}
            onDelete={() => deleteBlock(block.id)}
            onConvert={(type) => convertBlock(block.id, type)}
          />
        ))}
      </div>
      <div className="h-32" />
    </div>
  )
}
