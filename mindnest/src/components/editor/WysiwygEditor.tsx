import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { cn } from '../../utils/cn'
import { useSettingsStore } from '../../stores/settings'
import {
  Bold, Italic, Underline, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered,
  CheckSquare, Quote, Link, Minus, Trash2,
  Eye, Edit3, PaintRoller, Type, Copy, Check, ChevronDown,
  ChevronRight, Moon, Sun
} from 'lucide-react'

type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 
  'bullet' | 'ordered' | 'todo' | 'quote' | 'code' | 'divider'

type CodeTheme = 'dark' | 'light'

interface Block {
  id: string
  type: BlockType
  content: string
  meta?: { 
    checked?: boolean
    language?: string
    name?: string
    folded?: boolean
    theme?: CodeTheme
  }
}

interface WysiwygEditorProps {
  initialTitle?: string
  initialContent?: string
  onSave?: (data: { title: string; content: string }) => void
  onDirtyChange?: (isDirty: boolean) => void
}

const generateId = () => Math.random().toString(36).slice(2, 9)

const languages = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'html', name: 'HTML' },
  { id: 'css', name: 'CSS' },
  { id: 'json', name: 'JSON' },
  { id: 'bash', name: 'Bash' },
  { id: 'sql', name: 'SQL' },
  { id: 'rust', name: 'Rust' },
  { id: 'go', name: 'Go' },
  { id: 'plaintext', name: '纯文本' },
]

// 斜杠命令项
const slashCommands = [
  { type: 'heading1' as BlockType, label: '标题 1', icon: Heading1, desc: '大标题', shortcut: 'h1' },
  { type: 'heading2' as BlockType, label: '标题 2', icon: Heading2, desc: '中标题', shortcut: 'h2' },
  { type: 'heading3' as BlockType, label: '标题 3', icon: Heading3, desc: '小标题', shortcut: 'h3' },
  { type: 'bullet' as BlockType, label: '无序列表', icon: List, desc: '项目符号列表', shortcut: 'ul' },
  { type: 'ordered' as BlockType, label: '有序列表', icon: ListOrdered, desc: '编号列表', shortcut: 'ol' },
  { type: 'todo' as BlockType, label: '任务列表', icon: CheckSquare, desc: '带复选框的列表', shortcut: 'todo' },
  { type: 'quote' as BlockType, label: '引用', icon: Quote, desc: '引用文本', shortcut: 'quote' },
  { type: 'code' as BlockType, label: '代码块', icon: Code, desc: '代码片段', shortcut: 'dm' },
  { type: 'divider' as BlockType, label: '分割线', icon: Minus, desc: '分隔线', shortcut: 'hr' },
]

export function WysiwygEditor({ 
  initialTitle = '', 
  initialContent = '',
  onSave,
  onDirtyChange,
}: WysiwygEditorProps) {
  const { settings } = useSettingsStore()
  const autoSaveInterval = settings.general.autoSaveInterval
  
  const [title, setTitle] = useState(initialTitle)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isEditMode, setIsEditMode] = useState(true)
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())
  
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const cursorColumnRef = useRef<number>(0)
  
  // 解析初始内容
  const parseContent = useCallback((content: string): Block[] => {
    if (!content.trim()) {
      return [{ id: generateId(), type: 'paragraph', content: '' }]
    }
    
    const lines = content.split('\n')
    const result: Block[] = []
    let currentCodeBlock: { language: string; name: string; content: string[] } | null = null
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()
      
      // 代码块结束
      if (currentCodeBlock && trimmed === '```') {
        result.push({
          id: generateId(),
          type: 'code',
          content: currentCodeBlock.content.join('\n'),
          meta: {
            language: currentCodeBlock.language || 'plaintext',
            name: currentCodeBlock.name,
            folded: false,
            theme: 'dark'
          }
        })
        currentCodeBlock = null
        continue
      }
      
      // 代码块内容
      if (currentCodeBlock) {
        currentCodeBlock.content.push(line)
        continue
      }
      
      // 代码块开始
      if (trimmed.startsWith('```')) {
        const match = trimmed.match(/```(\w+)?(?:\s+"([^"]+)")?/)
        currentCodeBlock = {
          language: match?.[1] || 'plaintext',
          name: match?.[2] || '',
          content: []
        }
        continue
      }
      
      // 空行跳过
      if (!trimmed) continue
      
      // 其他块类型
      const id = generateId()
      if (trimmed.startsWith('# ')) {
        result.push({ id, type: 'heading1', content: trimmed.slice(2) })
      } else if (trimmed.startsWith('## ')) {
        result.push({ id, type: 'heading2', content: trimmed.slice(3) })
      } else if (trimmed.startsWith('### ')) {
        result.push({ id, type: 'heading3', content: trimmed.slice(4) })
      } else if (trimmed.startsWith('- [ ] ')) {
        result.push({ id, type: 'todo', content: trimmed.slice(6), meta: { checked: false } })
      } else if (trimmed.startsWith('- [x] ')) {
        result.push({ id, type: 'todo', content: trimmed.slice(6), meta: { checked: true } })
      } else if (trimmed.startsWith('- ')) {
        result.push({ id, type: 'bullet', content: trimmed.slice(2) })
      } else if (/^\d+\.\s/.test(trimmed)) {
        result.push({ id, type: 'ordered', content: trimmed.replace(/^\d+\.\s/, '') })
      } else if (trimmed.startsWith('> ')) {
        result.push({ id, type: 'quote', content: trimmed.slice(2) })
      } else if (trimmed === '---') {
        result.push({ id, type: 'divider', content: '' })
      } else {
        result.push({ id, type: 'paragraph', content: trimmed })
      }
    }
    
    // 未闭合的代码块
    if (currentCodeBlock) {
      result.push({
        id: generateId(),
        type: 'code',
        content: currentCodeBlock.content.join('\n'),
        meta: {
          language: currentCodeBlock.language || 'plaintext',
          name: currentCodeBlock.name,
          folded: false,
          theme: 'dark'
        }
      })
    }
    
    return result.length > 0 ? result : [{ id: generateId(), type: 'paragraph', content: '' }]
  }, [])
  
  // 初始化
  useEffect(() => {
    setTitle(initialTitle)
    setBlocks(parseContent(initialContent))
    setIsDirty(false)
  }, [initialContent, initialTitle, parseContent])
  
  // 通知父组件 dirty 状态变化
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])
  
  // 检测当前选区格式
  useEffect(() => {
    let lastAppliedRange: Range | null = null

    const handleSelectionChange = () => {
      const formats = new Set<string>()
      if (document.queryCommandState('bold')) formats.add('bold')
      if (document.queryCommandState('italic')) formats.add('italic')
      if (document.queryCommandState('underline')) formats.add('underline')
      if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough')
      setActiveFormats(formats)

      // 如果格式刷激活，自动应用到选区
      if (formatBrushStyleRef.current && activeId) {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)

          // 避免对同一个选区重复应用
          if (lastAppliedRange &&
              lastAppliedRange.startContainer === range.startContainer &&
              lastAppliedRange.startOffset === range.startOffset &&
              lastAppliedRange.endContainer === range.endContainer &&
              lastAppliedRange.endOffset === range.endOffset) {
            return
          }

          if (!range.collapsed) {
            lastAppliedRange = range.cloneRange()
            const editorElement = contentRefs.current.get(activeId)
            if (editorElement) {
              // 使用 execCommand 应用颜色（会自动替换已存在的颜色）
              if (formatBrushStyleRef.current.color) {
                document.execCommand('foreColor', false, formatBrushStyleRef.current.color)
              }
              if (formatBrushStyleRef.current.backgroundColor) {
                document.execCommand('backColor', false, formatBrushStyleRef.current.backgroundColor)
              }

              // 更新内容
              updateBlock(activeId, editorElement.innerHTML)
            }
          }
        }
      } else {
        lastAppliedRange = null
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [activeId])
  
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
        case 'code': {
          const lang = b.meta?.language || 'plaintext'
          const name = b.meta?.name ? ` "${b.meta.name}"` : ''
          return `\`\`\`${lang}${name}\n${b.content}\n\`\`\``
        }
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
  const updateBlock = useCallback((id: string, content: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b))
    setIsDirty(true)
  }, [])

  // 更新块元数据
  const updateBlockMeta = (id: string, meta: Partial<Block['meta']>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, meta: { ...b.meta, ...meta } } : b))
    setIsDirty(true)
  }

  // 添加新块
  const addBlock = (afterId: string, type: BlockType = 'paragraph') => {
    const newBlock: Block = { id: generateId(), type, content: '' }
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
      const prevBlock = index > 0 ? prev[index - 1] : null
      const currentBlock = prev[index]
      const newBlocks = prev.filter(b => b.id !== id)

      // 聚焦到上一个块，并追加内容
      if (prevBlock) {
        setTimeout(() => {
          // 将当前块的内容追加到上一个块
          if (currentBlock.content.trim()) {
            setBlocks(p => p.map(b =>
              b.id === prevBlock.id
                ? { ...b, content: b.content + currentBlock.content }
                : b
            ))
          }
          // 聚焦到上一个块（会自动跳到末尾）
          setActiveId(prevBlock.id)
        }, 0)
      }
      return newBlocks
    })
    setIsDirty(true)
  }
  
  // 转换块类型
  const convertBlock = (id: string, type: BlockType) => {
    const block = blocks.find(b => b.id === id)
    if (!block) return
    
    setBlocks(prev => prev.map(b => {
      if (b.id !== id) return b
      const newBlock: Block = { ...b, type }
      if (type === 'todo' && b.meta?.checked === undefined) {
        newBlock.meta = { ...b.meta, checked: false }
      }
      if (type === 'code') {
        newBlock.meta = { 
          ...b.meta, 
          language: 'javascript',
          name: '',
          folded: false,
          theme: 'dark'
        }
        // 转换代码块时，在下方添加新段落
        setTimeout(() => addBlock(id, 'paragraph'), 0)
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
      // 设置标志，让目标块聚焦到末尾
      cursorColumnRef.current = Infinity
      setActiveId(blocks[index - 1].id)
    }
  }
  
  // 聚焦到下一个块
  const focusNextBlock = () => {
    if (!activeId) return
    const index = blocks.findIndex(b => b.id === activeId)
    if (index < blocks.length - 1) {
      // 设置标志，让目标块聚焦到末尾
      cursorColumnRef.current = Infinity
      setActiveId(blocks[index + 1].id)
    }
  }
  
  // 保存当前选区（用于颜色选择器）
  const savedRangeRef = useRef<Range | null>(null)
  // 格式刷状态
  const [formatBrush, setFormatBrush] = useState<{ color?: string; bgColor?: string } | null>(null)
  // 格式刷应用的样式
  const formatBrushStyleRef = useRef<{ color?: string; backgroundColor?: string } | null>(null)

  const saveSelection = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange()
    }
  }, [])

  // 清除格式刷
  const clearFormatBrush = useCallback(() => {
    setFormatBrush(null)
    formatBrushStyleRef.current = null
  }, [])

  // 执行格式化命令
  const execCommand = useCallback((command: string, value: string = '') => {
    if (!activeId) return
    const editorElement = contentRefs.current.get(activeId)
    if (!editorElement) return

    // 颜色命令会在下面自己处理选区，其他命令需要 focus
    if (command !== 'foreColor' && command !== 'backColor') {
      editorElement.focus()
    }

    // 处理颜色命令 - 使用 execCommand
    if (command === 'foreColor' || command === 'backColor') {
      // 优先使用保存的选区
      if (savedRangeRef.current) {
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
          try {
            selection.addRange(savedRangeRef.current)
          } catch (e) {
            savedRangeRef.current = null
            return
          }
        }
        savedRangeRef.current = null
      }

      if (command === 'foreColor') {
        document.execCommand('foreColor', false, value)
      } else {
        document.execCommand('backColor', false, value)
      }
      updateBlock(activeId, editorElement.innerHTML)
    }
    // 处理字号命令
    else if (command === 'fontSize' && value.endsWith('px')) {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      if (range.collapsed) return

      // 创建 span 设置字体大小
      const span = document.createElement('span')
      span.style.fontSize = value

      try {
        range.surroundContents(span)
        selection.removeAllRanges()
        const newRange = document.createRange()
        newRange.selectNodeContents(span)
        selection.addRange(newRange)
      } catch (e) {
        // 如果选区跨越多个节点，使用 extractContents
        const fragment = range.extractContents()
        span.appendChild(fragment)
        range.insertNode(span)
        selection.removeAllRanges()
        const newRange = document.createRange()
        newRange.selectNodeContents(span)
        selection.addRange(newRange)
      }

      // 触发保存
      updateBlock(activeId, editorElement.innerHTML)
    }
    else {
      document.execCommand(command, false, value)
      updateBlock(activeId, editorElement.innerHTML)
    }
  }, [activeId, updateBlock])
  
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
    const url = prompt('请输入链接地址:')
    if (url) {
      execCommand('createLink', url)
    }
  }
  
  // 注册 ref
  const registerRef = (id: string, el: HTMLDivElement | null) => {
    if (el) {
      contentRefs.current.set(id, el)
    } else {
      contentRefs.current.delete(id)
    }
  }
  
  return (
    <div ref={containerRef} className="h-full flex flex-col bg-background">
      {/* 工具栏 */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/30 overflow-x-auto">
        <ToolbarGroup>
          <ToolbarButton icon={Bold} title="加粗" isActive={activeFormats.has('bold')} onClick={() => execCommand('bold')} />
          <ToolbarButton icon={Italic} title="斜体" isActive={activeFormats.has('italic')} onClick={() => execCommand('italic')} />
          <ToolbarButton icon={Underline} title="下划线" isActive={activeFormats.has('underline')} onClick={() => execCommand('underline')} />
          <ToolbarButton icon={Strikethrough} title="删除线" isActive={activeFormats.has('strikeThrough')} onClick={() => execCommand('strikeThrough')} />
        </ToolbarGroup>
        
        <ToolbarGroup>
          <select
            onChange={(e) => {
              if (e.target.value) {
                execCommand('fontSize', e.target.value)
                e.target.value = ''
              }
            }}
            className="text-xs px-2 py-1.5 rounded border border-border bg-background outline-none cursor-pointer"
            value=""
          >
            <option value="">字号</option>
            <option value="12px">12px</option>
            <option value="14px">14px</option>
            <option value="16px">16px</option>
            <option value="18px">18px</option>
            <option value="20px">20px</option>
            <option value="24px">24px</option>
            <option value="28px">28px</option>
            <option value="32px">32px</option>
          </select>
        </ToolbarGroup>
        
        {/* 颜色选择器 ToolbarGroup */}
        <ColorPickerToolbarGroup activeId={activeId} contentRefs={contentRefs} updateBlock={updateBlock} saveSelection={saveSelection} savedRangeRef={savedRangeRef} />

        <ToolbarGroup>
          <ToolbarButton
            icon={PaintRoller}
            title="格式刷（点击后选中文字自动应用格式）"
            isActive={!!formatBrush}
            onClick={() => {
              if (formatBrush) {
                // 已经是格式刷模式，取消
                clearFormatBrush()
              } else {
                // 获取当前选区的格式作为格式刷
                const selection = window.getSelection()
                if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0)
                  const container = range.commonAncestorContainer
                  const element = container.nodeType === Node.TEXT_NODE
                    ? container.parentElement
                    : container as HTMLElement
                  if (element) {
                    const color = element.style.color
                    const bgColor = element.style.backgroundColor
                    if (color || bgColor) {
                      formatBrushStyleRef.current = {
                        color: color || undefined,
                        backgroundColor: bgColor || undefined
                      }
                      setFormatBrush({
                        color: color || undefined,
                        bgColor: bgColor || undefined
                      })
                    }
                  }
                }
              }
            }}
          />
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
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setIsDirty(true)
                  onDirtyChange?.(true)
                }}
                placeholder="无标题文档"
                className={cn(
                  "w-full text-4xl font-bold text-foreground",
                  "bg-background border-0 outline-none resize-none",
                  "placeholder:text-muted-foreground/50"
                )}
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
              <BlockComponent
                key={block.id}
                block={block}
                isActive={activeId === block.id}
                isEditMode={isEditMode}
                cursorColumnRef={cursorColumnRef}
                registerRef={registerRef}
                onUpdate={(content) => updateBlock(block.id, content)}
                onUpdateMeta={(meta) => updateBlockMeta(block.id, meta)}
                onFocus={() => setActiveId(block.id)}
                onAddBelow={(type) => addBlock(block.id, type)}
                onDelete={() => deleteBlock(block.id)}
                onConvert={(type) => convertBlock(block.id, type)}
                onFocusPrev={index > 0 ? focusPrevBlock : undefined}
                onFocusNext={index < blocks.length - 1 ? focusNextBlock : undefined}
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

// 预设颜色列表
const PRESET_COLORS = [
  { name: '红色', color: '#ef4444' },
  { name: '暗红', color: '#dc2626' },
  { name: '橙色', color: '#f97316' },
  { name: '棕色', color: '#92400e' },
  { name: '黄色', color: '#eab308' },
  { name: '绿色', color: '#22c55e' },
  { name: '蓝色', color: '#3b82f6' },
  { name: '紫色', color: '#a855f7' },
  { name: '粉色', color: '#ec4899' },
  { name: '黑色', color: '#18181b' },
]

// 颜色按钮组件（字体颜色 / 字体背景）
function ColorButton({
  icon,
  label,
  onApply,
  onOpen
}: {
  icon: React.ReactNode
  label: string
  onApply: (color: string | null) => void
  onOpen?: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const closePopup = useCallback(() => {
    setIsOpen(false)
    setSelectedColor(null)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        closePopup()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, closePopup])

  return (
    <div ref={triggerRef} style={{ position: 'relative' }}>
      <button
        className={cn(
          "p-2 rounded-lg cursor-pointer transition-all",
          isOpen ? "bg-accent" : "hover:bg-accent/50"
        )}
        onClick={(e) => {
          e.stopPropagation()
          if (!isOpen && onOpen) {
            onOpen()
          }
          setIsOpen(!isOpen)
        }}
        title={label}
      >
        {icon}
      </button>

      {isOpen && (
        <div
          ref={(node) => {
            ;(popupRef as React.MutableRefObject<HTMLDivElement | null>).current = node
            if (node && triggerRef.current) {
              const rect = triggerRef.current.getBoundingClientRect()
              const popupWidth = 220
              node.style.top = `${rect.bottom + 8}px`
              node.style.left = `${rect.left + rect.width / 2 - popupWidth / 2}px`
            }
          }}
          style={{
            position: 'fixed',
            backgroundColor: '#ffffff',
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            border: '1px solid #e5e7eb',
            padding: 12,
            zIndex: 9999,
            width: 220
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>{label}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 12 }}>
            {PRESET_COLORS.map(({ name, color }) => (
              <button
                key={color}
                style={{
                  backgroundColor: color,
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer'
                }}
                title={name}
                onClick={() => {
                  onApply(color)
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10, borderTop: '1px solid #f3f4f6' }}>
            <input
              type="color"
              style={{ width: 24, height: 24, cursor: 'pointer', border: '1px solid #d1d5db', borderRadius: 4, padding: 0 }}
              title="自定义颜色"
              onChange={(e) => {
                onApply(e.target.value)
              }}
            />
            <span style={{ fontSize: 12, color: '#6b7280' }}>自定义</span>
            <button
              style={{
                marginLeft: 'auto',
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 4,
                border: 'none',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                cursor: 'pointer'
              }}
              onClick={() => setIsOpen(false)}
            >
              完成
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// 颜色选择器 ToolbarGroup
function ColorPickerToolbarGroup({
  activeId,
  contentRefs,
  updateBlock,
  saveSelection,
  savedRangeRef
}: {
  activeId: string | null
  contentRefs: React.MutableRefObject<Map<string, HTMLDivElement>>
  updateBlock: (id: string, content: string) => void
  saveSelection: () => void
  savedRangeRef: React.MutableRefObject<Range | null>
}) {
  const applyTextColor = useCallback((color: string | null) => {
    if (!activeId) return
    const editorElement = contentRefs.current.get(activeId)
    if (!editorElement) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    if (!range) return

    // 找到选区所在的 span
    const container = range.commonAncestorContainer
    let parentSpan: HTMLElement | null = null

    if (container.nodeType === Node.TEXT_NODE) {
      parentSpan = (container as Text).parentElement as HTMLElement
    } else {
      parentSpan = container as HTMLElement
    }

    // 向上查找 span
    while (parentSpan && parentSpan !== editorElement && parentSpan.tagName !== 'SPAN') {
      parentSpan = parentSpan.parentElement as HTMLElement
    }

    if (color) {
      if (parentSpan && parentSpan !== editorElement && parentSpan.tagName === 'SPAN') {
        // 如果已经在一个 span 内，只修改文字颜色，保留背景色
        parentSpan.style.color = color
      } else {
        // 创建新 span
        const span = document.createElement('span')
        span.style.color = color
        try {
          range.surroundContents(span)
        } catch (e) {
          const fragment = range.extractContents()
          span.appendChild(fragment)
          range.insertNode(span)
        }
      }
    } else {
      // 恢复默认 - 移除 span 但保留内容
      if (parentSpan && parentSpan !== editorElement && parentSpan.tagName === 'SPAN') {
        const text = document.createTextNode(parentSpan.textContent || '')
        parentSpan.parentNode?.replaceChild(text, parentSpan)
      }
    }

    updateBlock(activeId, editorElement.innerHTML)
  }, [activeId, contentRefs, updateBlock])

  const applyBgColor = useCallback((color: string | null) => {
    if (!activeId) return
    const editorElement = contentRefs.current.get(activeId)
    if (!editorElement) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    if (!range) return

    // 找到选区所在的 span
    const container = range.commonAncestorContainer
    let parentSpan: HTMLElement | null = null

    if (container.nodeType === Node.TEXT_NODE) {
      parentSpan = (container as Text).parentElement as HTMLElement
    } else {
      parentSpan = container as HTMLElement
    }

    // 向上查找 span
    while (parentSpan && parentSpan !== editorElement && parentSpan.tagName !== 'SPAN') {
      parentSpan = parentSpan.parentElement as HTMLElement
    }

    if (color) {
      if (parentSpan && parentSpan !== editorElement && parentSpan.tagName === 'SPAN') {
        // 如果已经在一个 span 内，只修改背景色，保留文字颜色
        parentSpan.style.backgroundColor = color
      } else {
        // 创建新 span
        const span = document.createElement('span')
        span.style.backgroundColor = color
        try {
          range.surroundContents(span)
        } catch (e) {
          const fragment = range.extractContents()
          span.appendChild(fragment)
          range.insertNode(span)
        }
      }
    } else {
      // 恢复默认 - 移除 span 但保留内容
      if (parentSpan && parentSpan !== editorElement && parentSpan.tagName === 'SPAN') {
        const text = document.createTextNode(parentSpan.textContent || '')
        parentSpan.parentNode?.replaceChild(text, parentSpan)
      }
    }

    updateBlock(activeId, editorElement.innerHTML)
  }, [activeId, contentRefs, updateBlock])

  return (
    <ToolbarGroup>
      {/* 字体颜色按钮 */}
      <ColorButton
        icon={<span style={{ fontSize: 16, fontWeight: 'bold', color: '#000000' }}>A</span>}
        label="字体颜色"
        onApply={applyTextColor}
        onOpen={saveSelection}
      />
      {/* 字体背景按钮 */}
      <ColorButton
        icon={<span style={{ fontSize: 16, fontWeight: 'bold', color: '#ffffff', backgroundColor: '#000000', padding: '0 2px' }}>A</span>}
        label="字体背景"
        onApply={applyBgColor}
        onOpen={saveSelection}
      />
    </ToolbarGroup>
  )
}

function ToolbarButton({ 
  icon: Icon, 
  onClick, 
  title,
  isActive = false
}: { 
  icon: any
  onClick: () => void 
  title: string
  isActive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-2 rounded-lg transition-all",
        isActive 
          ? "bg-primary text-primary-foreground" 
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

// 块组件属性
interface BlockComponentProps {
  block: Block
  isActive: boolean
  isEditMode: boolean
  cursorColumnRef: React.MutableRefObject<number>
  registerRef: (id: string, el: HTMLDivElement | null) => void
  onUpdate: (content: string) => void
  onUpdateMeta: (meta: Partial<Block['meta']>) => void
  onFocus: () => void
  onAddBelow: (type: BlockType) => void
  onDelete: () => void
  onConvert: (type: BlockType) => void
  onFocusPrev?: () => void
  onFocusNext?: () => void
}

// 块组件
function BlockComponent({
  block,
  isActive,
  isEditMode,
  cursorColumnRef,
  registerRef,
  onUpdate,
  onUpdateMeta,
  onFocus,
  onAddBelow,
  onDelete,
  onConvert,
  onFocusPrev,
  onFocusNext
}: BlockComponentProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [menuIndex, setMenuIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const isComposing = useRef(false)
  const hasInitialized = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)
  
  // 注册 ref
  useEffect(() => {
    registerRef(block.id, contentRef.current)
    return () => registerRef(block.id, null)
  }, [block.id])
  
  // 初始化内容 - 只在进入编辑模式且未初始化时执行
  useEffect(() => {
    if (!isEditMode) {
      hasInitialized.current = false
      return
    }
    if (hasInitialized.current || !contentRef.current) return
    
    if (block.type === 'code') {
      // 代码块：将 \n 转换为 <div> 以实现多行显示
      const lines = block.content.split('\n')
      contentRef.current.innerHTML = lines.map(line => `<div>${line}</div>`).join('')
    } else {
      contentRef.current.innerHTML = block.content
    }
    hasInitialized.current = true
  }, [isEditMode, block.id, block.type])
  
  // 自动聚焦 - 并设置光标到末尾
  useEffect(() => {
    if (isActive && contentRef.current && isEditMode) {
      contentRef.current.focus()
      
      // 设置光标到末尾
      setTimeout(() => {
        if (!contentRef.current) return
        
        const selection = window.getSelection()
        const range = document.createRange()
        
        // 选择所有内容并折叠到末尾
        range.selectNodeContents(contentRef.current)
        range.collapse(false) // false = 折叠到末尾
        
        selection?.removeAllRanges()
        selection?.addRange(range)
        
        // 重置光标列位置
        cursorColumnRef.current = -1
      }, 0)
    }
  }, [isActive, isEditMode])
  
  // 过滤命令
  const filteredCommands = useMemo(() => {
    if (!searchQuery) return slashCommands
    return slashCommands.filter(cmd => 
      cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.shortcut?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery])
  
  // 处理输入
  const handleInput = () => {
    if (!contentRef.current || isComposing.current) return
    
    if (block.type === 'code') {
      // 代码块：获取纯文本，正确处理换行
      // contentEditable 中换行会产生 <div> 或 <br>，需要特殊处理
      let text = ''
      const children = contentRef.current.childNodes
      for (let i = 0; i < children.length; i++) {
        if (i > 0) text += '\n'
        const node = children[i]
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          text += (node as HTMLElement).innerText || (node as HTMLElement).textContent || ''
        }
      }
      onUpdate(text)
    } else {
      // 其他块：使用 HTML
      onUpdate(contentRef.current.innerHTML)
    }
  }
  
  // 处理键盘
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 斜杠菜单
    if (showMenu) {
      if (e.key === 'Escape') {
        setShowMenu(false)
        setSearchQuery('')
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMenuIndex(i => (i + 1) % filteredCommands.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMenuIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = filteredCommands[menuIndex]
        if (item) {
          // 清除 /
          if (contentRef.current) {
            const text = contentRef.current.textContent || ''
            const slashIndex = text.lastIndexOf('/')
            if (slashIndex >= 0) {
              const newText = text.substring(0, slashIndex)
              contentRef.current.textContent = newText
              onUpdate(newText)
            }
          }
          onConvert(item.type)
        }
        setShowMenu(false)
        setSearchQuery('')
        return
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setSearchQuery(prev => prev + e.key)
        return
      }
      if (e.key === 'Backspace') {
        setSearchQuery(prev => {
          if (prev.length <= 1) {
            setShowMenu(false)
            return ''
          }
          return prev.slice(0, -1)
        })
        return
      }
    }
    
    // Enter 处理
    if (e.key === 'Enter' && !e.shiftKey) {
      // 代码块内：允许换行
      if (block.type === 'code') {
        // 不阻止默认行为，允许在代码块内换行
        return
      }
      // 其他块：创建新块
      e.preventDefault()
      onAddBelow('paragraph')
      return
    }
    
    // Backspace 删除空块（内容为空或只有空白字符）
    if (e.key === 'Backspace') {
      const text = contentRef.current?.textContent?.trim() || ''
      if (text === '') {
        e.preventDefault()
        onDelete()
        return
      }
    }
    
    // / 触发菜单
    if (e.key === '/') {
      const selection = window.getSelection()
      if (selection) {
        const textBefore = contentRef.current?.textContent?.substring(0, selection.anchorOffset) || ''
        if (textBefore === '' || textBefore.endsWith(' ')) {
          setShowMenu(true)
          setMenuIndex(0)
          setSearchQuery('')
        }
      }
      return
    }
    
    // 上下键切换块
    if (e.key === 'ArrowUp') {
      const selection = window.getSelection()
      if (selection && contentRef.current) {
        // 检查光标是否在第一行/开头
        const range = selection.getRangeAt(0)
        const preCaretRange = range.cloneRange()
        preCaretRange.selectNodeContents(contentRef.current)
        preCaretRange.setEnd(range.endContainer, range.endOffset)
        const caretPosition = preCaretRange.toString().length
        
        // 代码块：检查是否在第一行
        if (block.type === 'code') {
          const textBeforeCaret = contentRef.current.textContent?.substring(0, caretPosition) || ''
          const linesBefore = textBeforeCaret.split('\n').length - 1
          if (linesBefore === 0) {
            e.preventDefault()
            onFocusPrev?.()
          }
        } else {
          // 普通块：检查是否在开头
          if (caretPosition === 0) {
            e.preventDefault()
            onFocusPrev?.()
          }
        }
      }
      return
    }
    
    if (e.key === 'ArrowDown') {
      const selection = window.getSelection()
      if (selection && contentRef.current) {
        const range = selection.getRangeAt(0)
        const preCaretRange = range.cloneRange()
        preCaretRange.selectNodeContents(contentRef.current)
        preCaretRange.setEnd(range.endContainer, range.endOffset)
        const caretPosition = preCaretRange.toString().length
        const text = contentRef.current.textContent || ''
        
        // 代码块：检查是否在最后一行
        if (block.type === 'code') {
          const textBeforeCaret = text.substring(0, caretPosition)
          const linesBefore = textBeforeCaret.split('\n').length - 1
          const totalLines = text.split('\n').length - 1
          
          if (linesBefore >= totalLines) {
            e.preventDefault()
            onFocusNext?.()
          }
        } else {
          // 普通块：检查是否在末尾
          if (caretPosition >= text.length) {
            e.preventDefault()
            onFocusNext?.()
          }
        }
      }
      return
    }
  }
  
  // 复制代码
  const copyCode = async () => {
    await navigator.clipboard.writeText(block.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  // 切换折叠
  const toggleFold = () => onUpdateMeta({ folded: !block.meta?.folded })
  
  // 切换主题
  const toggleTheme = () => onUpdateMeta({ theme: block.meta?.theme === 'dark' ? 'light' : 'dark' })
  
  // 分割线
  if (block.type === 'divider') {
    return <hr className="my-4 border-border" />
  }
  
  const isDark = block.meta?.theme !== 'light'
  const isFolded = block.meta?.folded || false
  
  // 阅读模式
  if (!isEditMode) {
    return (
      <div className="py-0.5">
        {block.type === 'heading1' && <h1 className="text-3xl font-bold mt-4">{block.content}</h1>}
        {block.type === 'heading2' && <h2 className="text-2xl font-semibold mt-3">{block.content}</h2>}
        {block.type === 'heading3' && <h3 className="text-xl font-semibold mt-2">{block.content}</h3>}
        {block.type === 'paragraph' && <div className="text-base leading-relaxed py-1">{block.content}</div>}
        {block.type === 'bullet' && (
          <div className="flex items-start gap-2 py-1">
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground flex-shrink-0" />
            <span>{block.content}</span>
          </div>
        )}
        {block.type === 'ordered' && (
          <div className="flex items-start gap-2 py-1">
            <span className="text-muted-foreground flex-shrink-0 w-5">1.</span>
            <span>{block.content}</span>
          </div>
        )}
        {block.type === 'todo' && (
          <div className="flex items-start gap-2 py-1">
            <input type="checkbox" checked={block.meta?.checked} readOnly className="mt-1 flex-shrink-0" />
            <span className={block.meta?.checked ? 'line-through text-muted-foreground' : ''}>{block.content}</span>
          </div>
        )}
        {block.type === 'quote' && (
          <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground py-1">
            {block.content}
          </blockquote>
        )}
        {block.type === 'code' && (
          <div className="rounded-lg overflow-hidden border border-border my-2">
            <div className={cn("flex items-center gap-2 px-3 py-2 border-b", isDark ? "bg-zinc-900 border-zinc-800" : "bg-gray-100 border-gray-200")}>
              {isFolded ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              <Code className={cn("w-4 h-4", isDark ? "text-zinc-400" : "text-gray-600")} />
              <span className={cn("text-xs", isDark ? "text-zinc-400" : "text-gray-600")}>{block.meta?.name || '代码'}</span>
              <span className="text-xs text-muted-foreground ml-2">{languages.find(l => l.id === block.meta?.language)?.name || 'Plain Text'}</span>
            </div>
            {!isFolded && (
              <div className={cn("flex", isDark ? "bg-zinc-950" : "bg-white")}>
                <div className={cn("flex-shrink-0 w-12 py-3 text-right pr-3 text-sm font-mono select-none border-r", isDark ? "text-zinc-600 bg-zinc-900/50 border-zinc-800" : "text-gray-400 bg-gray-50 border-gray-200")}>
                  {Array.from({ length: Math.max(1, (block.content.match(/\n/g) || []).length + 1) }, (_, i) => <div key={i}>{i + 1}</div>)}
                </div>
                <div className="flex-1 p-3 overflow-x-auto">
                  <pre className={cn("font-mono text-sm whitespace-pre", isDark ? "text-zinc-100" : "text-gray-800")}><code>{block.content}</code></pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
  
  // 编辑模式 - 代码块
  if (block.type === 'code') {
    return (
      <div className="relative py-0.5">
        <div className={cn("rounded-lg overflow-hidden border", isDark ? "border-zinc-800" : "border-gray-200")}>
          {/* 工具栏 */}
          <div className={cn("flex items-center gap-2 px-3 py-2 border-b", isDark ? "bg-zinc-900 border-zinc-800" : "bg-gray-100 border-gray-200")}>
            <button onClick={toggleFold} className={cn("p-1 rounded transition-colors", isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-gray-200 text-gray-600")}>
              {isFolded ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <Code className={cn("w-4 h-4", isDark ? "text-zinc-400" : "text-gray-600")} />
            <input
              type="text"
              value={block.meta?.name || ''}
              onChange={(e) => onUpdateMeta({ name: e.target.value })}
              placeholder="代码块名称"
              className={cn("bg-transparent border-0 outline-none text-xs w-32", isDark ? "text-zinc-300 placeholder:text-zinc-600" : "text-gray-700 placeholder:text-gray-400")}
            />
            <div className="flex-1" />
            <select
              value={block.meta?.language || 'plaintext'}
              onChange={(e) => onUpdateMeta({ language: e.target.value })}
              className={cn("text-xs px-2 py-1 rounded border outline-none cursor-pointer", isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300" : "bg-white border-gray-300 text-gray-700")}
            >
              {languages.map(lang => <option key={lang.id} value={lang.id}>{lang.name}</option>)}
            </select>
            <button onClick={toggleTheme} className={cn("p-1.5 rounded transition-colors", isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-gray-200 text-gray-600")}>
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button onClick={copyCode} className={cn("flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors", isDark ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200")}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已复制' : '复制'}
            </button>
            <button 
              onClick={onDelete} 
              className={cn("p-1.5 rounded transition-colors", isDark ? "hover:bg-red-900/50 text-red-400" : "hover:bg-red-50 text-red-500")}
              title="删除代码块"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          
          {/* 编辑区域 */}
          {!isFolded && (
            <div className={cn("flex", isDark ? "bg-zinc-950" : "bg-white")}>
              <div className={cn("flex-shrink-0 w-12 py-3 text-right pr-3 text-sm font-mono select-none border-r", isDark ? "text-zinc-600 bg-zinc-900/50 border-zinc-800" : "text-gray-400 bg-gray-50 border-gray-200")}>
                {Array.from({ length: Math.max(1, (block.content.match(/\n/g) || []).length + 1) }, (_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <div className="flex-1 overflow-x-auto">
                <div
                  ref={contentRef}
                  contentEditable
                  suppressContentEditableWarning
                  className={cn("min-h-[80px] p-3 font-mono text-sm outline-none whitespace-pre", isDark ? "text-zinc-100" : "text-gray-800")}
                  onInput={handleInput}
                  onFocus={onFocus}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* 斜杠菜单 */}
        {showMenu && (
          <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-popover border border-border rounded-lg shadow-lg py-1">
            <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border mb-1">
              {searchQuery ? `搜索: ${searchQuery}` : '基本块'}
            </div>
            {filteredCommands.map((item, index) => {
              const Icon = item.icon
              return (
                <button
                  key={item.type}
                  onClick={() => {
                    const text = contentRef.current?.textContent || ''
                    const slashIndex = text.lastIndexOf('/')
                    if (slashIndex >= 0 && contentRef.current) {
                      contentRef.current.textContent = text.substring(0, slashIndex)
                      onUpdate(text.substring(0, slashIndex))
                    }
                    onConvert(item.type)
                    setShowMenu(false)
                    setSearchQuery('')
                  }}
                  className={cn("w-full flex items-center gap-3 px-3 py-2 text-left transition-colors", index === menuIndex ? "bg-accent" : "hover:bg-accent/50")}
                >
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">{item.label}</div>
                      {item.shortcut && <span className="text-xs text-muted-foreground/60">/{item.shortcut}</span>}
                    </div>
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
  
  // 编辑模式 - 普通块
  const getClassName = () => {
    const base = isActive ? "w-full outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50" : "w-full outline-none"
    switch (block.type) {
      case 'heading1': return cn(base, "text-3xl font-bold mt-4")
      case 'heading2': return cn(base, "text-2xl font-semibold mt-3")
      case 'heading3': return cn(base, "text-xl font-semibold mt-2")
      case 'quote': return cn(base, "border-l-4 border-primary/30 pl-4 italic text-muted-foreground")
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
      default: return '输入内容，输入 / 选择块类型'
    }
  }
  
  return (
    <div className="relative py-0.5">
      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        className={getClassName()}
        data-placeholder={getPlaceholder()}
        onInput={handleInput}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
      />
      
      {showMenu && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-popover border border-border rounded-lg shadow-lg py-1">
          <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border mb-1">
            {searchQuery ? `搜索: ${searchQuery}` : '基本块'}
          </div>
          {filteredCommands.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={item.type}
                onClick={() => {
                  const html = contentRef.current?.innerHTML || ''
                  const slashIndex = html.lastIndexOf('/')
                  if (slashIndex >= 0 && contentRef.current) {
                    contentRef.current.innerHTML = html.substring(0, slashIndex)
                    onUpdate(html.substring(0, slashIndex))
                  }
                  onConvert(item.type)
                  setShowMenu(false)
                  setSearchQuery('')
                }}
                className={cn("w-full flex items-center gap-3 px-3 py-2 text-left transition-colors", index === menuIndex ? "bg-accent" : "hover:bg-accent/50")}
              >
                <Icon className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">{item.label}</div>
                    {item.shortcut && <span className="text-xs text-muted-foreground/60">/{item.shortcut}</span>}
                  </div>
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
