import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { cn } from '../../utils/cn'
import { useSettingsStore } from '../../stores/settings'
import { 
  Plus, Trash2, GripVertical, Save,
  Heading1, Heading2, Heading3, List, ListOrdered, 
  CheckSquare, Quote, Code, Minus, Type, Image, Table2, 
  FileText, Map, Music, Video, Link2, Calculator, Sparkles, 
  Clock, LayoutGrid, Hash, AlignLeft, CheckCircle2
} from 'lucide-react'

type BlockType = 'title' | 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bullet' | 'number' | 'todo' | 'quote' | 'code' | 'divider' | 'callout'

interface Block {
  id: string
  type: BlockType
  content: string
  meta?: { checked?: boolean; language?: string; theme?: string; name?: string }
}

interface CommandItem {
  type: BlockType
  label: string
  desc?: string
  icon: any
  shortcut?: string
  keywords?: string[]
}

interface CommandGroup {
  name: string
  items: CommandItem[]
}

// 命令分组配置 - 匹配语雀风格
const commandGroups: CommandGroup[] = [
  {
    name: '最近使用',
    items: [
      { type: 'code', label: '代码块', desc: '支持多种语言和主题切换', icon: Code, shortcut: '/dmk', keywords: ['dmk', 'daimakuai', 'code'] },
      { type: 'heading1', label: '标题 1', desc: '', icon: Heading1, keywords: ['h1', 'biaoti'] },
    ]
  },
  {
    name: '基础',
    items: [
      { type: 'heading1', label: '标题 1', desc: '创建大标题', icon: Heading1, shortcut: '/h1', keywords: ['h1', 'bt1', 'biaoti'] },
      { type: 'heading2', label: '标题 2', desc: '创建中等标题', icon: Heading2, shortcut: '/h2', keywords: ['h2', 'bt2'] },
      { type: 'heading3', label: '标题 3', desc: '创建小标题', icon: Heading3, shortcut: '/h3', keywords: ['h3', 'bt3'] },
      { type: 'paragraph', label: '文本', desc: '普通文本段落', icon: Type, keywords: ['text', 'wenben'] },
      { type: 'bullet', label: '无序列表', desc: '创建项目符号列表', icon: List, shortcut: '/lb', keywords: ['lb', 'liebiao', 'list'] },
      { type: 'number', label: '有序列表', desc: '创建编号列表', icon: ListOrdered, shortcut: '/ol', keywords: ['ol', 'youxu'] },
      { type: 'todo', label: '待办事项', desc: '创建任务清单', icon: CheckSquare, shortcut: '/todo', keywords: ['todo', 'daiban'] },
      { type: 'quote', label: '引用', desc: '引用文本块', icon: Quote, shortcut: '/quote', keywords: ['quote', 'yinyong'] },
      { type: 'code', label: '代码块', desc: '支持多种语言和主题切换', icon: Code, shortcut: '/dmk', keywords: ['code', 'daimakuai', 'dmk', 'dm'] },
      { type: 'divider', label: '分割线', desc: '插入水平分割线', icon: Minus, shortcut: '/fgx', keywords: ['fgx', 'fenge', 'divider'] },
    ]
  },
  {
    name: 'AI',
    items: [
      { type: 'paragraph', label: 'AI 续写', desc: '让AI帮你续写内容', icon: Sparkles, shortcut: '/ai', keywords: ['ai', 'xuxie'] },
      { type: 'paragraph', label: 'AI 总结', desc: '总结当前内容', icon: FileText, shortcut: '/summary', keywords: ['summary', 'zongjie'] },
    ]
  },
  {
    name: '高级',
    items: [
      { type: 'callout', label: '高亮块', desc: '醒目的提示框', icon: LayoutGrid, keywords: ['callout', 'gaoliang'] },
      { type: 'paragraph', label: '表格', desc: '插入数据表格', icon: Table2, shortcut: '/table', keywords: ['table', 'biaoge'] },
      { type: 'paragraph', label: '图片', desc: '插入图片', icon: Image, shortcut: '/image', keywords: ['image', 'tupian'] },
      { type: 'paragraph', label: '附件', desc: '上传文件附件', icon: FileText, shortcut: '/file', keywords: ['file', 'fujian'] },
      { type: 'paragraph', label: '公式', desc: '插入数学公式', icon: Calculator, shortcut: '/formula', keywords: ['formula', 'gongshi'] },
    ]
  }
]

// 平铺所有命令用于搜索
const allCommands: (CommandItem & { group: string })[] = []
commandGroups.forEach(group => {
  group.items.forEach(item => {
    allCommands.push({ ...item, group: group.name })
  })
})

const typeConfig: Record<BlockType, { label: string; icon: any }> = {
  title: { label: '标题', icon: Type },
  paragraph: { label: '文本', icon: Type },
  heading1: { label: '标题1', icon: Heading1 },
  heading2: { label: '标题2', icon: Heading2 },
  heading3: { label: '标题3', icon: Heading3 },
  bullet: { label: '列表', icon: List },
  number: { label: '编号', icon: ListOrdered },
  todo: { label: '待办', icon: CheckSquare },
  quote: { label: '引用', icon: Quote },
  code: { label: '代码', icon: Code },
  divider: { label: '分割线', icon: Minus },
  callout: { label: '高亮块', icon: LayoutGrid }
}

const generateId = () => Math.random().toString(36).slice(2, 9)

// 代码块组件 - 深色主题，带行号
const CodeBlock = memo(function CodeBlock({
  block,
  onUpdate,
  onAddBelow,
  onDelete
}: {
  block: Block
  onUpdate: (id: string, content: string, meta?: any) => void
  onAddBelow?: () => void
  onDelete?: () => void
}) {
  const [localContent, setLocalContent] = useState(block.content)
  const [language, setLanguage] = useState(block.meta?.language || 'plaintext')
  const [theme, setTheme] = useState(block.meta?.theme || 'darcula')
  const [blockName, setBlockName] = useState(block.meta?.name || '')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalContent(block.content)
  }, [block.content])

  // 同步 block.meta 变化
  useEffect(() => {
    if (block.meta?.language) {
      setLanguage(block.meta.language)
    }
    if (block.meta?.theme) {
      setTheme(block.meta.theme)
    }
  }, [block.meta])

  // 计算行号
  const lineCount = localContent.split('\n').length
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setLocalContent(newValue)
    onUpdate(block.id, newValue, { language, theme })
  }

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang)
    onUpdate(block.id, localContent, { language: newLang, theme })
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    onUpdate(block.id, localContent, { language, theme: newTheme, name: blockName })
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setBlockName(newName)
    onUpdate(block.id, localContent, { language, theme, name: newName })
  }

  // 点击外部关闭更多菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 阻止事件冒泡，防止触发父级的块创建
    e.stopPropagation()
    
    // 在代码块中，普通 Enter 正常插入换行（不拦截）
    // 只有 Shift+Enter 退出代码块
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      onAddBelow?.()
      return
    }
    
    // 空内容时按 Backspace 删除代码块
    if (e.key === 'Backspace' && localContent === '') {
      e.preventDefault()
      onDelete?.()
      return
    }
  }

  // 复制功能
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [localContent])

  // 根据主题获取样式
  const getThemeStyles = () => {
    switch (theme) {
      case 'github':
        return {
          bg: 'bg-gray-50',
          headerBg: 'bg-gray-100',
          border: 'border-gray-200',
          text: 'text-gray-800',
          lineNumber: 'text-gray-400'
        }
      case 'monokai':
        return {
          bg: 'bg-[#272822]',
          headerBg: 'bg-[#3e3d32]',
          border: 'border-[#49483e]',
          text: 'text-[#f8f8f2]',
          lineNumber: 'text-[#75715e]'
        }
      case 'dracula':
        return {
          bg: 'bg-[#282a36]',
          headerBg: 'bg-[#44475a]',
          border: 'border-[#6272a4]',
          text: 'text-[#f8f8f2]',
          lineNumber: 'text-[#6272a4]'
        }
      case 'darcula':
      default:
        return {
          bg: 'bg-[#2b2b2b]',
          headerBg: 'bg-[#3c3f41]',
          border: 'border-[#4b4b4b]',
          text: 'text-[#a9b7c6]',
          lineNumber: 'text-[#606366]'
        }
    }
  }

  const styles = getThemeStyles()

  return (
    <div className={cn("my-2 rounded-lg overflow-hidden border", styles.border, styles.bg)}>
      {/* 代码块头部 */}
      <div className={cn("flex items-center justify-between px-3 py-2 border-b", styles.headerBg, styles.border)}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* 折叠按钮 */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn("p-1 rounded transition-transform duration-200 flex-shrink-0",
              isCollapsed ? "rotate-[-90deg]" : "",
              theme === 'github' ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-white/10 text-gray-400 hover:text-white'
            )}
            title={isCollapsed ? "展开" : "折叠"}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* 代码块名称输入 */}
          <input
            type="text"
            value={blockName}
            onChange={handleNameChange}
            placeholder="请输入代码块名称"
            className={cn("text-sm bg-transparent outline-none flex-1 min-w-0",
              theme === 'github' 
                ? 'text-gray-700 placeholder:text-gray-400' 
                : 'text-gray-300 placeholder:text-gray-500'
            )}
          />

          <select 
            className={cn("text-xs outline-none cursor-pointer rounded px-2 py-1 border", 
              theme === 'github' ? 'bg-white border-gray-300 text-gray-700' : 'bg-black/20 border-white/10 text-gray-300 hover:text-white'
            )}
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            <option value="plaintext" className={styles.bg}>Plain Text</option>
            <option value="javascript" className={styles.bg}>JavaScript</option>
            <option value="typescript" className={styles.bg}>TypeScript</option>
            <option value="python" className={styles.bg}>Python</option>
            <option value="rust" className={styles.bg}>Rust</option>
            <option value="go" className={styles.bg}>Go</option>
            <option value="java" className={styles.bg}>Java</option>
            <option value="cpp" className={styles.bg}>C++</option>
            <option value="bash" className={styles.bg}>Bash</option>
            <option value="sql" className={styles.bg}>SQL</option>
            <option value="json" className={styles.bg}>JSON</option>
            <option value="yaml" className={styles.bg}>YAML</option>
            <option value="markdown" className={styles.bg}>Markdown</option>
            <option value="html" className={styles.bg}>HTML</option>
            <option value="css" className={styles.bg}>CSS</option>
          </select>
          
          <select 
            className={cn("text-xs outline-none cursor-pointer rounded px-2 py-1 border",
              theme === 'github' ? 'bg-white border-gray-300 text-gray-700' : 'bg-black/20 border-white/10 text-gray-300 hover:text-white'
            )}
            value={theme}
            onChange={(e) => handleThemeChange(e.target.value)}
          >
            <option value="darcula" className={styles.bg}>Darcula</option>
            <option value="github" className={styles.bg}>GitHub</option>
            <option value="monokai" className={styles.bg}>Monokai</option>
            <option value="dracula" className={styles.bg}>Dracula</option>
          </select>
        </div>
        
        <div className="flex items-center gap-1">
          {/* 复制按钮 */}
          <button 
            className={cn("p-1.5 rounded transition-colors relative",
              theme === 'github' ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-white/10 text-gray-400 hover:text-white',
              copied && "text-green-500"
            )}
            title={copied ? "已复制!" : "复制代码"}
            onClick={handleCopy}
          >
            {copied ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          {/* 折叠/展开按钮 */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn("p-1.5 rounded transition-colors text-xs",
              theme === 'github' ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-white/10 text-gray-400 hover:text-white'
            )}
            title={isCollapsed ? "展开" : "折叠"}
          >
            {isCollapsed ? `${lineCount} 行` : '收起'}
          </button>

          {/* 更多菜单 */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={cn("p-1.5 rounded transition-colors",
                theme === 'github' ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-white/10 text-gray-400 hover:text-white'
              )}
              title="更多操作"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            {/* 更多菜单下拉 */}
            {showMoreMenu && (
              <div className={cn(
                "absolute right-0 top-full mt-1 w-40 rounded-lg shadow-xl z-50 py-1 border",
                theme === 'github' ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'
              )}>
                <button
                  onClick={() => {
                    handleCopy()
                    setShowMoreMenu(false)
                  }}
                  className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                    theme === 'github' 
                      ? 'hover:bg-gray-100 text-gray-700' 
                      : 'hover:bg-white/10 text-gray-300'
                  )}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  复制
                </button>
                <button
                  onClick={() => {
                    setIsCollapsed(!isCollapsed)
                    setShowMoreMenu(false)
                  }}
                  className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                    theme === 'github' 
                      ? 'hover:bg-gray-100 text-gray-700' 
                      : 'hover:bg-white/10 text-gray-300'
                  )}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCollapsed ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
                  </svg>
                  {isCollapsed ? '展开' : '折叠'}
                </button>
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete()
                      setShowMoreMenu(false)
                    }}
                    className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors text-red-500",
                      theme === 'github' ? 'hover:bg-red-50' : 'hover:bg-red-500/10'
                    )}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    删除
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 代码内容区 - 带行号 */}
      {!isCollapsed && (
        <div className="flex">
          {/* 行号 */}
          <div className={cn("py-3 px-3 text-right border-r select-none min-w-[3rem]", styles.bg, styles.border)}>
            {lineNumbers.map(num => (
              <div key={num} className={cn("text-xs leading-5 font-mono", styles.lineNumber)}>{num}</div>
            ))}
          </div>
          
          {/* 代码输入区 */}
          <div className={cn("flex-1 p-3", styles.bg)}>
            <textarea
              ref={textareaRef}
              value={localContent}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className={cn("w-full bg-transparent text-sm font-mono leading-5 resize-none outline-none whitespace-pre", styles.text)}
              placeholder="输入代码..."
              spellCheck={false}
              style={{ minHeight: `${Math.max(lineCount * 20, 80)}px` }}
            />
          </div>
        </div>
      )}
      
      {/* 提示：Shift+Enter 退出代码块 */}
      <div className={cn("px-3 py-1 text-xs border-t flex items-center justify-between", styles.headerBg, styles.border, styles.lineNumber)}>
        <span>{isCollapsed ? '已折叠' : 'Enter 换行，Shift+Enter 退出代码块'}</span>
        <span>{language} • {theme}</span>
      </div>
    </div>
  )
})

// ===== 命令菜单组件 =====
const CommandMenu = memo(function CommandMenu({
  query,
  onSelect,
  onClose
}: {
  query: string
  onSelect: (type: BlockType) => void
  onClose: () => void
}) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // 过滤匹配的命令
  const filteredGroups = useCallback(() => {
    if (!query) return commandGroups
    
    const lowerQuery = query.toLowerCase()
    return commandGroups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        // 检查标签
        if (item.label.toLowerCase().includes(lowerQuery)) return true
        // 检查快捷方式
        if (item.shortcut?.toLowerCase().includes(lowerQuery)) return true
        // 检查关键词
        if (item.keywords?.some(k => k.toLowerCase().includes(lowerQuery))) return true
        return false
      })
    })).filter(group => group.items.length > 0)
  }, [query])()

  // 平铺所有可见命令
  const visibleCommands = filteredGroups.flatMap(g => g.items)

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % visibleCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + visibleCommands.length) % visibleCommands.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (visibleCommands[selectedIndex]) {
          onSelect(visibleCommands[selectedIndex].type)
        }
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visibleCommands, selectedIndex, onSelect, onClose])

  // 滚动选中项到视图
  useEffect(() => {
    const el = itemRefs.current[selectedIndex]
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex])

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // 如果没有匹配项，显示空状态
  if (visibleCommands.length === 0) {
    return (
      <div 
        ref={menuRef}
        className="absolute left-0 top-full mt-1 w-80 bg-popover border border-border rounded-xl shadow-2xl z-50 py-6 px-4"
      >
        <div className="text-center text-muted-foreground">
          <div className="text-3xl mb-2">🔍</div>
          <div className="text-sm">未找到匹配的命令</div>
          <div className="text-xs mt-1 opacity-60">试试输入 "/h1"、"/dmk" 或 "/lb"</div>
        </div>
      </div>
    )
  }

  let commandIndex = 0

  return (
    <div 
      ref={menuRef}
      className="absolute left-0 top-full mt-1 w-80 bg-popover border border-border rounded-xl shadow-2xl z-50 py-2 max-h-[480px] overflow-y-auto"
    >
      {filteredGroups.map((group, groupIdx) => {
        if (group.items.length === 0) return null
        
        return (
          <div key={group.name} className={groupIdx > 0 ? 'mt-2 pt-2 border-t border-border' : ''}>
            {/* 分组标题 */}
            <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">
              {group.name}
            </div>
            
            {/* 命令项 */}
            {group.items.map((item) => {
              const Icon = item.icon
              const idx = commandIndex++
              const isSelected = idx === selectedIndex
              
              return (
                <button
                  key={`${group.name}-${item.label}`}
                  ref={el => itemRefs.current[idx] = el}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onSelect(item.type)
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150",
                    isSelected 
                      ? "bg-accent" 
                      : "hover:bg-accent/50"
                  )}
                >
                  {/* 图标 */}
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                    isSelected ? "bg-accent-foreground/10" : "bg-muted"
                  )}>
                    <Icon className={cn(
                      "w-4.5 h-4.5 transition-colors",
                      isSelected ? "text-accent-foreground" : "text-muted-foreground"
                    )} />
                  </div>
                  
                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "text-sm font-medium transition-colors",
                      isSelected ? "text-accent-foreground" : "text-foreground"
                    )}>
                      {item.label}
                    </div>
                    {item.desc && (
                      <div className="text-xs text-muted-foreground truncate">
                        {item.desc}
                      </div>
                    )}
                  </div>
                  
                  {/* 快捷键 */}
                  {item.shortcut && (
                    <div className={cn(
                      "text-xs font-mono px-1.5 py-0.5 rounded transition-colors",
                      isSelected 
                        ? "bg-accent-foreground/20 text-accent-foreground" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {item.shortcut}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
})

// ===== 单个块组件 =====
// 自定义比较函数：忽略 block.content 变化，因为我们使用本地状态管理
function blockItemAreEqual(prevProps: any, nextProps: any) {
  return (
    prevProps.block.id === nextProps.block.id &&
    prevProps.block.type === nextProps.block.type &&
    prevProps.index === nextProps.index &&
    prevProps.isFirst === nextProps.isFirst &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.showPlaceholder === nextProps.showPlaceholder &&
    prevProps.onUpdate === nextProps.onUpdate &&
    prevProps.onFocus === nextProps.onFocus &&
    prevProps.onAddBelow === nextProps.onAddBelow &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onConvert === nextProps.onConvert
  )
}

const BlockItem = memo(function BlockItem({
  block,
  index,
  isFirst,
  isActive,
  showPlaceholder,
  onUpdate,
  onFocus,
  onAddBelow,
  onDelete,
  onConvert
}: {
  block: Block
  index: number
  isFirst: boolean
  isActive: boolean
  showPlaceholder: boolean
  onUpdate: (id: string, content: string, meta?: any) => void
  onFocus: (id: string) => void
  onAddBelow: (id: string, type?: BlockType) => void
  onDelete: (id: string) => void
  onConvert: (id: string, type: BlockType) => void
}) {
  const [localContent, setLocalContent] = useState(block.content)
  const [showMenu, setShowMenu] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 只在切换文档/块时同步内容，编辑时不重置光标
  useEffect(() => {
    setLocalContent(block.content)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id])

  useEffect(() => {
    if (textareaRef.current && block.type !== 'code') {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [localContent, block.type])

  // 当块变为活跃状态时自动聚焦
  useEffect(() => {
    if (isActive && textareaRef.current && block.type !== 'code' && block.type !== 'divider') {
      textareaRef.current.focus()
    }
  }, [isActive, block.id, block.type])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setLocalContent(newValue)
    
    // 检查是否输入了 "/" 开头的命令
    if (newValue.startsWith('/')) {
      setCommandQuery(newValue)
      setShowMenu(true)
    } else {
      setCommandQuery('')
      setShowMenu(false)
      onUpdate(block.id, newValue)
    }
  }

  // 执行命令
  const executeCommand = (type: BlockType) => {
    setCommandQuery('')
    setLocalContent('')
    setShowMenu(false)
    onConvert(block.id, type)
    // 阻止后续事件处理
    setTimeout(() => {
      // 确保命令执行后不会触发其他块的创建
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 如果菜单打开，不处理特殊按键（由菜单组件处理）
    if (showMenu && commandQuery) {
      if (['Enter', 'ArrowDown', 'ArrowUp', 'Escape'].includes(e.key)) {
        return
      }
    }

    // Enter 键处理
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      
      // 在代码块中：插入换行符
      if (block.type === 'code') {
        const target = e.target as HTMLTextAreaElement
        const start = target.selectionStart
        const newValue = localContent.substring(0, start) + '\n' + localContent.substring(target.selectionEnd)
        setLocalContent(newValue)
        onUpdate(block.id, newValue)
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 1
        }, 0)
        return
      }
      
      // 标题块按Enter变成段落
      if (block.type === 'title') {
        onConvert(block.id, 'paragraph')
        return
      }
      
      // 其他块：创建新块
      onAddBelow(block.id, 'paragraph')
      return
    }
    
    // Backspace 删除空块
    if (e.key === 'Backspace' && localContent === '' && !isFirst) {
      e.preventDefault()
      onDelete(block.id)
      return
    }
    
    // Tab 键
    if (e.key === 'Tab') {
      e.preventDefault()
      const target = e.target as HTMLTextAreaElement
      const start = target.selectionStart
      const end = target.selectionEnd
      const newValue = localContent.substring(0, start) + '  ' + localContent.substring(end)
      setLocalContent(newValue)
      onUpdate(block.id, newValue)
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2
      }, 0)
    }
  }

  // 获取占位符文本
  const getPlaceholder = () => {
    if (block.type === 'title') return '无标题'
    if (showPlaceholder && block.type === 'paragraph' && !localContent && !commandQuery) {
      return '输入内容，或使用 "/" 选择类型'
    }
    return ''
  }

  // 渲染不同类型的块
  if (block.type === 'code') {
    return (
      <div className="group relative py-1">
        <CodeBlock 
          block={block} 
          onUpdate={onUpdate} 
          onAddBelow={() => onAddBelow(block.id, 'paragraph')}
          onDelete={!isFirst ? () => onDelete(block.id) : undefined} 
        />
      </div>
    )
  }

  if (block.type === 'callout') {
    return (
      <div className="group relative flex items-start gap-1 py-0.5 -mx-12 px-12">
        <div className="w-6 flex items-start justify-center pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab" />
        </div>
        <div className="flex-1">
          <div className="my-2 p-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-gray-500">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <textarea
                ref={textareaRef}
                value={localContent}
                onChange={handleChange}
                onFocus={() => onFocus(block.id)}
                onKeyDown={handleKeyDown}
                className="flex-1 resize-none outline-none bg-transparent text-base leading-relaxed placeholder:text-muted-foreground/40"
                placeholder="输入提示内容..."
                rows={1}
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const baseProps = {
    ref: textareaRef,
    value: localContent,
    onChange: handleChange,
    onFocus: () => onFocus(block.id),
    onKeyDown: handleKeyDown,
    className: cn(
      "w-full resize-none outline-none bg-transparent"
    ),
    placeholder: getPlaceholder(),
    rows: 1,
    spellCheck: false,
    'data-block-id': block.id,
    'data-block-type': block.type
  }

  const renderContent = () => {
    switch (block.type) {
      case 'title':
        return <textarea {...baseProps} className={cn(baseProps.className, "text-4xl font-bold placeholder:text-muted-foreground/40")} />
      case 'heading1':
        return <textarea {...baseProps} className={cn(baseProps.className, "text-3xl font-bold mt-6")} />
      case 'heading2':
        return <textarea {...baseProps} className={cn(baseProps.className, "text-2xl font-semibold mt-4")} />
      case 'heading3':
        return <textarea {...baseProps} className={cn(baseProps.className, "text-xl font-semibold mt-3")} />
      case 'bullet':
        return (
          <div className="flex items-start gap-2">
            <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-foreground/60 flex-shrink-0" />
            <textarea {...baseProps} className={cn(baseProps.className, "flex-1")} />
          </div>
        )
      case 'number':
        return (
          <div className="flex items-start gap-2">
            <span className="mt-1.5 text-sm text-foreground/60 font-medium min-w-[1.5em]">{index}.</span>
            <textarea {...baseProps} className={cn(baseProps.className, "flex-1")} />
          </div>
        )
      case 'todo':
        return (
          <div className="flex items-start gap-2">
            <input 
              type="checkbox" 
              className="mt-2 w-4 h-4 rounded border-border flex-shrink-0"
              checked={block.meta?.checked}
            />
            <textarea {...baseProps} className={cn(baseProps.className, "flex-1")} />
          </div>
        )
      case 'quote':
        return (
          <blockquote className="border-l-4 border-primary/30 pl-4 my-2">
            <textarea {...baseProps} className={cn(baseProps.className, "italic")} />
          </blockquote>
        )
      case 'divider':
        return <hr className="my-6 border-border" />
      default:
        return <textarea {...baseProps} className={cn(baseProps.className, "text-base leading-relaxed")} />
    }
  }

  return (
    <div className={cn(
      "group relative flex items-start gap-1 py-0.5 -mx-12 px-12 hover:bg-accent/5 rounded-lg transition-colors",
      block.type === 'title' && "py-2"
    )}>
      {/* 拖拽手柄 */}
      <div className={cn(
        "w-6 flex items-start justify-center pt-2 opacity-0 group-hover:opacity-100 transition-opacity",
        block.type === 'title' && "pt-4"
      )}>
        <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab" />
      </div>

      {/* 内容区 */}
      <div className="flex-1 min-w-0 relative">
        {renderContent()}
        
        {/* 语雀风格命令菜单 */}
        {showMenu && (
          <CommandMenu
            query={commandQuery.slice(1)}
            onSelect={executeCommand}
            onClose={() => { setShowMenu(false); setCommandQuery('') }}
          />
        )}
      </div>

      {/* 右侧工具栏 */}
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity pt-1">
        <button
          onClick={() => onAddBelow(block.id, 'paragraph')}
          className="p-1 hover:bg-accent rounded text-muted-foreground"
          title="下方添加"
        >
          <Plus className="w-4 h-4" />
        </button>
        
        {!isFirst && (
          <button
            onClick={() => onDelete(block.id)}
            className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}, blockItemAreEqual)

// ===== 主编辑器组件 =====
export function StableEditor({ 
  content, 
  onChange, 
  onSave,
  title, 
  onTitleChange 
}: { 
  content?: string; 
  onChange?: (content: string) => void; 
  onSave?: (data: { content: string; title: string }) => void;
  title?: string; 
  onTitleChange?: (title: string) => void 
}) {
  const { settings } = useSettingsStore()
  const autoSaveInterval = settings.general.autoSaveInterval // 秒
  
  const [blocks, setBlocks] = useState<Block[]>([
    { id: generateId(), type: 'title', content: title || '' },
    { id: generateId(), type: 'paragraph', content: '' }
  ])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // 获取当前编辑器内容的辅助函数（直接从 DOM 读取最新值）
  const getCurrentContent = useCallback(() => {
    // 读取标题
    const titleEl = document.querySelector('[data-block-type="title"]') as HTMLTextAreaElement
    const currentTitle = titleEl?.value || title || ''
    
    // 读取所有内容块（排除标题）
    const contentEls = document.querySelectorAll('[data-block-type]:not([data-block-type="title"])')
    const lines: string[] = []
    
    contentEls.forEach((el) => {
      const textarea = el as HTMLTextAreaElement
      const blockType = el.getAttribute('data-block-type') as BlockType
      const text = textarea.value || ''
      
      switch (blockType) {
        case 'heading1': lines.push(`# ${text}`); break
        case 'heading2': lines.push(`## ${text}`); break
        case 'heading3': lines.push(`### ${text}`); break
        case 'bullet': lines.push(`- ${text}`); break
        case 'number': lines.push(`1. ${text}`); break
        case 'todo': {
          const checked = (el.querySelector('input[type="checkbox"]') as HTMLInputElement)?.checked
          lines.push(`- [${checked ? 'x' : ' '}] ${text}`)
          break
        }
        case 'quote': lines.push(`> ${text}`); break
        case 'code': lines.push(`\`\`\`\n${text}\n\`\`\``); break
        case 'divider': lines.push('---'); break
        default: lines.push(text)
      }
    })
    
    return {
      title: currentTitle,
      content: lines.join('\n\n')
    }
  }, [title])
  
  // 执行保存
  const handleSaveClick = useCallback(() => {
    if (!onSave) return
    const data = getCurrentContent()
    setIsSaving(true)
    onSave(data)
    setTimeout(() => setIsSaving(false), 500)
  }, [onSave, getCurrentContent])
  
  // 快捷键支持：Ctrl+S / Cmd+S / Ctrl+Alt+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S
      const isModS = (e.metaKey || e.ctrlKey) && e.key === 's' && !e.altKey
      // Ctrl+Alt+S
      const isCtrlAltS = e.ctrlKey && e.altKey && e.key === 's'
      
      if ((isModS || isCtrlAltS) && onSave) {
        e.preventDefault()
        e.stopPropagation()
        handleSaveClick()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [handleSaveClick, onSave])

  // 初始化 - 监听 content 变化重置 blocks
  useEffect(() => {
    if (content && content.trim()) {
      const lines = content.split('\n')
      const parsed: Block[] = [
        { id: generateId(), type: 'title', content: title || '' }
      ]
      
      lines.forEach((line) => {
        const trimmed = line.trim()
        if (!trimmed) return
        
        const id = generateId()
        if (trimmed.startsWith('# ')) {
          parsed.push({ id, type: 'heading1', content: trimmed.slice(2) })
        } else if (trimmed.startsWith('## ')) {
          parsed.push({ id, type: 'heading2', content: trimmed.slice(3) })
        } else if (trimmed.startsWith('### ')) {
          parsed.push({ id, type: 'heading3', content: trimmed.slice(4) })
        } else if (trimmed.startsWith('- [ ] ')) {
          parsed.push({ id, type: 'todo', content: trimmed.slice(6), meta: { checked: false } })
        } else if (trimmed.startsWith('- [x] ')) {
          parsed.push({ id, type: 'todo', content: trimmed.slice(6), meta: { checked: true } })
        } else if (trimmed.startsWith('- ')) {
          parsed.push({ id, type: 'bullet', content: trimmed.slice(2) })
        } else if (/^\d+\.\s/.test(trimmed)) {
          parsed.push({ id, type: 'number', content: trimmed.replace(/^\d+\.\s/, '') })
        } else if (trimmed.startsWith('> ')) {
          parsed.push({ id, type: 'quote', content: trimmed.slice(2) })
        } else if (trimmed === '---' || trimmed === '***') {
          parsed.push({ id, type: 'divider', content: '' })
        } else if (trimmed.startsWith('```')) {
          // 代码块
        } else {
          parsed.push({ id, type: 'paragraph', content: trimmed })
        }
      })

      if (parsed.length > 1) {
        setBlocks(parsed)
      }
    } else {
      // 空内容时重置为默认
      setBlocks([
        { id: generateId(), type: 'title', content: title || '' },
        { id: generateId(), type: 'paragraph', content: '' }
      ])
    }
  }, [content, title])

  // 序列化内容（根据设置自动保存）
  useEffect(() => {
    // 如果禁用自动保存，直接返回
    if (autoSaveInterval === 0) {
      return
    }
    
    const delayMs = autoSaveInterval * 1000 // 转换为毫秒
    
    const timer = setTimeout(() => {
      const titleBlock = blocks.find(b => b.type === 'title')
      const contentBlocks = blocks.filter(b => b.type !== 'title')
      
      if (titleBlock && onTitleChange && titleBlock.content !== title) {
        onTitleChange(titleBlock.content)
      }
      
      const markdown = contentBlocks.map(b => {
        switch (b.type) {
          case 'heading1': return `# ${b.content}`
          case 'heading2': return `## ${b.content}`
          case 'heading3': return `### ${b.content}`
          case 'bullet': return `- ${b.content}`
          case 'number': return `1. ${b.content}`
          case 'todo': return `- [${b.meta?.checked ? 'x' : ' '}] ${b.content}`
          case 'quote': return `> ${b.content}`
          case 'code': return `\`\`\`${b.meta?.language || ''}\n${b.content}\n\`\`\``
          case 'divider': return '---'
          default: return b.content
        }
      }).join('\n\n')
      
      onChange?.(markdown)
    }, delayMs)

    return () => clearTimeout(timer)
  }, [blocks, onChange, onTitleChange, title, autoSaveInterval])

  const updateBlock = useCallback((id: string, content: string, meta?: any) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== id) return b
      return { ...b, content, meta: meta || b.meta }
    }))
  }, [])

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === id)
      if (index <= 0) return prev // 不能删除标题或找不到
      if (prev.length <= 2) return prev // 至少保留2个块
      
      // 删除前记录前一个块
      const prevBlock = prev[index - 1]
      
      // 延迟设置焦点到前一个块的末尾
      setTimeout(() => {
        setActiveId(prevBlock.id)
        // 聚焦并将光标移到末尾
        const el = document.querySelector(`[data-block-id="${prevBlock.id}"]`) as HTMLTextAreaElement
        if (el) {
          el.focus()
          const len = el.value.length
          el.setSelectionRange(len, len)
        }
      }, 0)
      
      return prev.filter(b => b.id !== id)
    })
  }, [])

  const addBlock = useCallback((afterId: string, type: BlockType = 'paragraph') => {
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === afterId)
      // 如果后面已经有空段落块，不再创建
      const nextBlock = prev[index + 1]
      if (nextBlock && nextBlock.type === 'paragraph' && !nextBlock.content) {
        setTimeout(() => setActiveId(nextBlock.id), 0)
        return prev
      }
      
      const newBlock: Block = { 
        id: generateId(), 
        type, 
        content: '',
        meta: type === 'code' ? { language: 'plaintext', theme: 'darcula' } : 
              type === 'todo' ? { checked: false } : undefined
      }
      const newBlocks = [
        ...prev.slice(0, index + 1),
        newBlock,
        ...prev.slice(index + 1)
      ]
      setTimeout(() => setActiveId(newBlock.id), 0)
      return newBlocks
    })
  }, [])

  const convertBlock = useCallback((id: string, type: BlockType) => {
    setBlocks(prev => {
      // 转换块
      const newBlocks = prev.map(b => {
        if (b.id !== id) return b
        return { 
          ...b, 
          type, 
          content: type === 'divider' ? '' : b.content,
          meta: type === 'code' ? { language: 'plaintext', theme: 'darcula' } : 
                type === 'todo' ? { checked: false } : undefined
        }
      })
      
      // 对于代码块、分割线等特殊块，自动在后面添加空段落块（如果没有的话）
      if (type === 'code' || type === 'divider' || type === 'callout') {
        const index = newBlocks.findIndex(b => b.id === id)
        const isLastBlock = index === newBlocks.length - 1
        const nextBlock = newBlocks[index + 1]
        
        // 如果是最后一个块，或者下一个不是空段落，则添加
        if (isLastBlock || !(nextBlock?.type === 'paragraph' && !nextBlock?.content)) {
          const emptyBlock: Block = { 
            id: generateId(), 
            type: 'paragraph', 
            content: '' 
          }
          newBlocks.splice(index + 1, 0, emptyBlock)
          // 聚焦到新创建的块
          setTimeout(() => setActiveId(emptyBlock.id), 0)
        }
      }
      
      return newBlocks
    })
  }, [])

  const showPlaceholder = blocks.length === 2 && 
    blocks[1]?.type === 'paragraph' && 
    !blocks[1]?.content

  return (
    <div className="h-full overflow-y-auto py-12 px-4">
      {/* 顶部工具栏 */}
      {onSave && (
        <div className="max-w-3xl mx-auto mb-4 flex items-center justify-end gap-2">
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "shadow-sm hover:shadow"
            )}
            title="保存 (Ctrl+S / Ctrl+Alt+S)"
          >
            <Save className={cn("w-4 h-4", isSaving && "animate-pulse")} />
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      )}
      <div className="max-w-3xl mx-auto">
        {blocks.map((block, index) => (
          <BlockItem
            key={block.id}
            block={block}
            index={index}
            isFirst={index === 0}
            isActive={activeId === block.id}
            showPlaceholder={index === 1 && showPlaceholder}
            onUpdate={updateBlock}
            onFocus={setActiveId}
            onAddBelow={addBlock}
            onDelete={deleteBlock}
            onConvert={convertBlock}
          />
        ))}
      </div>
      <div className="h-32" />
    </div>
  )
}
