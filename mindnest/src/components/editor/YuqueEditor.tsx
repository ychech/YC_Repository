import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import { cn } from '../../utils/cn'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  CheckSquare,
  Link as LinkIcon,
  Image,
  Table,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Eye,
  EyeOff,
  Monitor,
  FileText,
  ChevronRight,
  Hash,
  Copy,
  Check,
  Type,
  Calculator
} from 'lucide-react'
import 'katex/dist/katex.min.css'

interface YuqueEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  className?: string
}

type ViewMode = 'edit' | 'preview' | 'split'

export function YuqueEditor({
  content = '',
  onChange,
  placeholder = '开始写作...',
  className
}: YuqueEditorProps) {
  const [value, setValue] = useState(content)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [headings, setHeadings] = useState<Array<{ level: number; text: string; line: number }>>([])
  const [showOutline, setShowOutline] = useState(true)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setValue(content)
  }, [content])

  // 提取大纲
  useEffect(() => {
    const lines = value.split('\n')
    const extracted = lines
      .map((line, index) => {
        const match = line.match(/^(#{1,6})\s+(.+)$/)
        if (match) {
          return {
            level: match[1].length,
            text: match[2],
            line: index
          }
        }
        return null
      })
      .filter((h): h is { level: number; text: string; line: number } => h !== null)
    setHeadings(extracted)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    setCursorPosition(e.target.selectionStart)
    onChange?.(newValue)
  }

  const insertText = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end)
    
    setValue(newText)
    onChange?.(newText)
    
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + selectedText.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [value, onChange])

  const insertHeading = (level: number) => {
    const prefix = '#'.repeat(level) + ' '
    insertText(prefix, '\n')
  }

  const insertList = (ordered: boolean = false) => {
    const prefix = ordered ? '1. ' : '- '
    insertText(prefix)
  }

  const insertTaskList = () => {
    insertText('- [ ] ')
  }

  const insertQuote = () => {
    insertText('> ')
  }

  const insertCodeBlock = () => {
    insertText('```typescript\n', '\n```\n')
  }

  const insertInlineCode = () => {
    insertText('`', '`')
  }

  const insertLink = () => {
    insertText('[链接文本](', ')')
  }

  const insertImage = () => {
    insertText('![图片描述](', ')')
  }

  const insertTable = () => {
    const table = `
| 列1 | 列2 | 列3 |
|------|------|------|
| 内容 | 内容 | 内容 |
| 内容 | 内容 | 内容 |
`
    insertText(table)
  }

  const insertDivider = () => {
    insertText('\n---\n')
  }

  const insertMath = () => {
    insertText('$$\n', '\n$$')
  }

  const scrollToHeading = (line: number) => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const lines = value.split('\n')
    let charCount = 0
    for (let i = 0; i < line; i++) {
      charCount += lines[i].length + 1
    }
    
    textarea.focus()
    textarea.setSelectionRange(charCount, charCount)
    
    // 计算行高并滚动
    const lineHeight = 24
    textarea.scrollTop = line * lineHeight - 100
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const ToolbarButton = ({ 
    onClick, 
    active = false, 
    children,
    title 
  }: { 
    onClick: () => void
    active?: boolean
    children: React.ReactNode
    title?: string
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-2 rounded-lg transition-all duration-150",
        "hover:bg-accent hover:scale-105",
        "active:scale-95",
        active && "bg-accent text-accent-foreground"
      )}
    >
      {children}
    </button>
  )

  const ToolbarGroup = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-0.5 px-1 border-r border-border last:border-0">
      {children}
    </div>
  )

  return (
    <div className={cn("flex flex-col h-full bg-background", className)} ref={editorContainerRef}>
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 backdrop-blur">
        <div className="flex items-center gap-1">
          {/* 格式工具 */}
          <ToolbarGroup>
            <ToolbarButton onClick={() => insertText('**', '**')} title="粗体">
              <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => insertText('*', '*')} title="斜体">
              <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => insertText('~~', '~~')} title="删除线">
              <Strikethrough className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={insertInlineCode} title="行内代码">
              <Code className="w-4 h-4" />
            </ToolbarButton>
          </ToolbarGroup>

          {/* 标题 */}
          <ToolbarGroup>
            <ToolbarButton onClick={() => insertHeading(1)} title="标题 1">
              <Heading1 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => insertHeading(2)} title="标题 2">
              <Heading2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => insertHeading(3)} title="标题 3">
              <Heading3 className="w-4 h-4" />
            </ToolbarButton>
          </ToolbarGroup>

          {/* 列表 */}
          <ToolbarGroup>
            <ToolbarButton onClick={() => insertList(false)} title="无序列表">
              <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => insertList(true)} title="有序列表">
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={insertTaskList} title="任务列表">
              <CheckSquare className="w-4 h-4" />
            </ToolbarButton>
          </ToolbarGroup>

          {/* 插入 */}
          <ToolbarGroup>
            <ToolbarButton onClick={insertQuote} title="引用">
              <Quote className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={insertCodeBlock} title="代码块">
              <FileText className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={insertLink} title="链接">
              <LinkIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={insertImage} title="图片">
              <Image className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={insertTable} title="表格">
              <Table className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={insertMath} title="公式">
              <Calculator className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={insertDivider} title="分割线">
              <Minus className="w-4 h-4" />
            </ToolbarButton>
          </ToolbarGroup>
        </div>

        {/* 右侧工具 */}
        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('edit')}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1.5",
                viewMode === 'edit' && "bg-card shadow-sm"
              )}
            >
              <Type className="w-3.5 h-3.5" />
              编辑
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1.5",
                viewMode === 'split' && "bg-card shadow-sm"
              )}
            >
              <Monitor className="w-3.5 h-3.5" />
              分栏
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1.5",
                viewMode === 'preview' && "bg-card shadow-sm"
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              预览
            </button>
          </div>

          {/* 复制按钮 */}
          <button
            onClick={copyToClipboard}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title="复制全文"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 编辑区主体 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 编辑器 */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={cn(
            "relative flex flex-col",
            viewMode === 'split' ? "flex-1" : "w-full"
          )}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              className="flex-1 w-full p-6 resize-none outline-none bg-transparent font-mono text-sm leading-7"
              spellCheck={false}
              style={{ 
                tabSize: 2,
                backgroundImage: 'linear-gradient(transparent 95%, rgba(0,0,0,0.05) 95%)',
                backgroundSize: '100% 28px',
                lineHeight: '28px'
              }}
            />
            
            {/* 底部统计 */}
            <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex items-center gap-4 bg-card/30">
              <span>{value.length} 字符</span>
              <span>{value.split(/\s+/).filter(Boolean).length} 词</span>
              <span>{headings.length} 标题</span>
              <span className="ml-auto">行 {value.substring(0, cursorPosition).split('\n').length}</span>
            </div>
          </div>
        )}

        {/* 分隔线 */}
        {viewMode === 'split' && (
          <div className="w-px bg-border" />
        )}

        {/* 预览区 */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={cn(
            "relative overflow-y-auto bg-card/20",
            viewMode === 'split' ? "flex-1" : "w-full"
          )}>
            <div className="prose prose-sm dark:prose-invert max-w-none p-8">
              {value ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex, rehypeHighlight]}
                  components={{
                    h1: ({ children }) => <h1 className="text-3xl font-bold mt-8 mb-4 pb-2 border-b">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-2xl font-semibold mt-6 mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xl font-semibold mt-5 mb-2">{children}</h3>,
                    code: ({ className, children }) => {
                      const match = /language-(\w+)/.exec(className || '')
                      return match ? (
                        <div className="relative group">
                          <div className="absolute right-2 top-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            {match[1]}
                          </div>
                          <pre className={className}>
                            <code>{children}</code>
                          </pre>
                        </div>
                      ) : (
                        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                      )
                    },
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary/30 pl-4 italic my-4 text-muted-foreground bg-muted/30 py-2 pr-4 rounded-r">
                        {children}
                      </blockquote>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4">
                        <table className="border-collapse border border-border w-full">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-border px-4 py-2 bg-muted font-semibold">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-border px-4 py-2">{children}</td>
                    ),
                    img: ({ src, alt }) => (
                      <img 
                        src={src} 
                        alt={alt} 
                        className="max-w-full rounded-lg shadow-md my-4"
                      />
                    ),
                  }}
                >
                  {value}
                </ReactMarkdown>
              ) : (
                <div className="text-muted-foreground text-center py-20">
                  <Type className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>开始写作，内容将在这里预览</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 右侧大纲 */}
        {showOutline && headings.length > 0 && (
          <div className="w-56 border-l border-border bg-card/30 overflow-y-auto hidden lg:block">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
                <Hash className="w-4 h-4" />
                大纲
              </div>
              <nav className="space-y-1">
                {headings.map((heading, index) => (
                  <button
                    key={index}
                    onClick={() => scrollToHeading(heading.line)}
                    className={cn(
                      "w-full text-left text-sm py-1 px-2 rounded hover:bg-accent transition-colors truncate",
                      heading.level === 1 && "font-medium",
                      heading.level === 2 && "pl-4",
                      heading.level >= 3 && "pl-6 text-muted-foreground"
                    )}
                    style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
                  >
                    {heading.text}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* 快捷键提示 */}
      <div className="px-4 py-1.5 border-t border-border text-xs text-muted-foreground bg-card/30 flex items-center gap-4">
        <span>快捷键:</span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded">⌘B</kbd> 粗体
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded">⌘I</kbd> 斜体
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded">```</kbd> 代码块
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded">#</kbd> 标题
        </span>
        <span className="ml-auto">支持 Markdown + LaTeX 公式</span>
      </div>
    </div>
  )
}
