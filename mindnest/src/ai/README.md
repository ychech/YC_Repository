# MindNest AI 系统

基于现代 AI 工具最佳实践（Cursor、Notion AI、Perplexity）构建的智能知识管理增强系统。

## 功能特性

### 1. 内联 AI 编辑

#### 选中文本悬浮工具栏
- **触发方式**: 选中文本自动显示
- **支持功能**:
  - 🔄 重写（6种风格：正式、随意、简洁、详细、专业、创意）
  - 🌐 翻译（支持 7+ 种语言）
  - 📝 摘要生成
  - ❓ 概念解释

```tsx
import { SelectionToolbar } from '@/components/ai'

function Editor() {
  return (
    <div className="editor">
      <textarea />
      <SelectionToolbar 
        containerSelector=".editor"
        onRewrite={(original, newText) => console.log('重写完成')}
      />
    </div>
  )
}
```

#### Slash 命令面板
- **触发方式**: 输入 `/`
- **分类**:
  - 🤖 AI 助手（续写、润色、摘要、翻译）
  - 📝 基础块（标题、列表、代码块、表格）
  - ✨ 高级功能（思维导图、日历事件）
  - 🖼️ 媒体（图片、视频）

```tsx
import { SlashCommandPanel } from '@/components/ai'

function EditorWithSlash() {
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  
  const handleSlashSelect = (command) => {
    // 处理命令
    if (command.category === 'ai') {
      // 调用 AI 功能
    } else {
      // 插入块
    }
  }
  
  return (
    <>
      <textarea 
        onChange={(e) => {
          if (e.target.value.endsWith('/')) {
            setSlashOpen(true)
            // 计算位置...
          }
        }}
      />
      <SlashCommandPanel
        open={slashOpen}
        query={slashQuery}
        position={cursorPos}
        onSelect={handleSlashSelect}
        onClose={() => setSlashOpen(false)}
      />
    </>
  )
}
```

### 2. 智能对话系统

#### 增强版 AI 聊天面板
- **引用溯源**: AI 回答标注来源文档
- **快速操作**: 一键续写、润色、摘要、解释
- **流式响应**: 实时显示生成内容
- **历史管理**: 支持重新生成、删除消息

```tsx
import { EnhancedAIChat } from '@/components/ai'

function DocumentPage({ document }) {
  return (
    <EnhancedAIChat
      documentId={document.id}
      documentContent={document.content}
      documentTitle={document.title}
      onInsertText={(text) => editor.insert(text)}
      onReplaceText={(text) => editor.replace(text)}
    />
  )
}
```

### 3. Hooks API

#### useTextSelection - 文本选择管理
```tsx
const { 
  text,           // 选中的文本
  hasSelection,   // 是否有选中
  position,       // 位置坐标
  replaceSelection,
  insertAfterSelection 
} = useTextSelection({
  containerSelector: '.editor',
  minLength: 2
})
```

#### useAIChat - AI 对话管理
```tsx
const {
  messages,
  isLoading,
  sendMessage,
  executeQuickAction,
  clearMessages,
  regenerate
} = useAIChat({
  documentId,
  documentContent
})
```

#### useInlineCompletion - 内联补全
```tsx
const {
  suggestion,
  visible,
  acceptCompletion,
  dismissCompletion
} = useInlineCompletion({
  content,
  cursorPosition,
  debounceMs: 300
})
```

#### useAIRewrite - 文本重写
```tsx
const { isLoading, rewrite, translate, summarize, explain } = useAIRewrite({
  onSuccess: (result) => console.log('完成'),
  onError: (error) => console.error('失败')
})
```

### 4. 核心服务

#### AIService - AI 服务核心
```typescript
import { aiService } from '@/ai/core/AIService'

// 智能对话
const response = await aiService.chat(messages, context)

// 文本重写
const rewritten = await aiService.rewrite(text, 'formal')

// 翻译
const translated = await aiService.translate(text, '英文')

// 续写
const completions = await aiService.complete(content, cursorPosition)
```

## 集成指南

### 步骤 1: 添加 Provider

```tsx
import { AIProvider } from '@/ai/core/AIProvider'

function App() {
  return (
    <AIProvider>
      <YourApp />
    </AIProvider>
  )
}
```

### 步骤 2: 在编辑器中集成

```tsx
import { 
  SelectionToolbar, 
  SlashCommandPanel, 
  EnhancedAIChat 
} from '@/components/ai'
import { useTextSelection } from '@/ai/hooks'

function SmartEditor() {
  const [content, setContent] = useState('')
  const [slashOpen, setSlashOpen] = useState(false)
  
  // 监听 slash 命令
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !slashOpen) {
        setSlashOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [slashOpen])
  
  return (
    <div className="relative">
      <textarea 
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="editor-textarea"
      />
      
      {/* 选中文本工具栏 */}
      <SelectionToolbar 
        containerSelector=".editor-textarea"
        onRewrite={(original, newText) => {
          setContent(content.replace(original, newText))
        }}
      />
      
      {/* Slash 命令 */}
      <SlashCommandPanel
        open={slashOpen}
        query=""
        position={{ x: 100, y: 100 }}
        onSelect={handleCommand}
        onClose={() => setSlashOpen(false)}
      />
      
      {/* AI 聊天面板 */}
      <EnhancedAIChat
        documentContent={content}
        onInsertText={(text) => setContent(content + text)}
        onReplaceText={(text) => setContent(text)}
      />
    </div>
  )
}
```

## 架构设计

```
src/ai/
├── core/
│   ├── types.ts          # 类型定义
│   ├── AIService.ts      # 核心服务
│   └── AIProvider.tsx    # React Context
├── hooks/
│   ├── useTextSelection.ts
│   ├── useAIChat.ts
│   ├── useInlineCompletion.ts
│   ├── useAIRewrite.ts
│   └── index.ts
└── features/
    └── (功能模块)

src/components/ai/
├── SelectionToolbar.tsx   # 选中文本工具栏
├── SlashCommandPanel.tsx  # Slash 命令面板
├── EnhancedAIChat.tsx     # 增强聊天面板
└── index.ts
```

## 参考实现

- **Cursor**: 幽灵文本、内联编辑
- **Notion AI**: 块级命令、上下文感知
- **Perplexity**: 引用溯源、多源检索
- **Claude**: 长上下文、代码理解

## 后续优化

1. **本地模型集成**: 接入 Ollama/llama.cpp
2. **向量检索**: LanceDB + Embedding
3. **知识图谱**: 图数据库支持
4. **工作流**: n8n 风格的 AI 自动化
