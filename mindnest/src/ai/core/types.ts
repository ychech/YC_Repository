// AI 核心类型定义

export interface AIRequest {
  id: string
  type: 'chat' | 'completion' | 'rewrite' | 'summarize' | 'translate' | 'explain'
  content: string
  context?: AIContext
  options?: AIRequestOptions
}

export interface AIContext {
  // 当前文档
  currentDocument?: {
    id: string
    title: string
    content: string
    type: string
  }
  
  // 选中的文本
  selectedText?: string
  
  // 最近的文档
  recentDocuments?: string[]
  
  // 对话历史
  conversationHistory?: Message[]
  
  // 知识库上下文
  knowledgeContext?: KnowledgeChunk[]
}

export interface KnowledgeChunk {
  documentId: string
  documentTitle: string
  content: string
  relevanceScore: number
}

export interface AIRequestOptions {
  // 流式输出
  stream?: boolean
  
  // 温度参数
  temperature?: number
  
  // 最大token数
  maxTokens?: number
  
  // 模型选择
  model?: string
  
  // 响应格式
  format?: 'text' | 'markdown' | 'json'
}

export interface AIResponse {
  id: string
  content: string
  citations?: Citation[]
  metadata?: {
    model: string
    tokensUsed: number
    processingTime: number
  }
}

export interface Citation {
  id: string
  source: 'document' | 'web' | 'knowledge'
  documentId?: string
  documentTitle?: string
  content: string
  relevanceScore: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  citations?: Citation[]
  metadata?: {
    model?: string
    tokensUsed?: number
  }
}

export interface CompletionItem {
  id: string
  text: string
  confidence: number
  type: 'continuation' | 'correction' | 'suggestion'
}

export interface InlineEditAction {
  id: string
  label: string
  icon: string
  shortcut?: string
  handler: (text: string) => Promise<string>
}

// AI 功能配置
export interface AIFeatureConfig {
  // 是否启用
  enabled: boolean
  
  // 触发方式
  trigger: 'auto' | 'manual' | 'shortcut'
  
  // 快捷键
  shortcut?: string
  
  // 延迟（自动触发时）
  delay?: number
  
  // 模型偏好
  preferredModel?: string
}

// 重写风格选项
export type RewriteStyle = 'formal' | 'casual' | 'concise' | 'elaborate' | 'professional' | 'creative'

export interface RewriteOptions {
  style: RewriteStyle
  preserveLength?: boolean
  keepTone?: boolean
}

// 翻译选项
export interface TranslateOptions {
  sourceLang?: string
  targetLang: string
  preserveFormatting?: boolean
}

// 摘要选项
export interface SummarizeOptions {
  maxLength?: number
  format?: 'paragraph' | 'bullet' | 'outline'
  focus?: string[]
}

// 工作流定义
export interface AIWorkflow {
  id: string
  name: string
  description: string
  trigger: WorkflowTrigger
  steps: WorkflowStep[]
  enabled: boolean
}

export type WorkflowTrigger =
  | { type: 'manual' }
  | { type: 'shortcut'; key: string }
  | { type: 'on-save' }
  | { type: 'on-create'; docType: string }
  | { type: 'scheduled'; cron: string }

export interface WorkflowStep {
  id: string
  type: 'ai-action' | 'create-doc' | 'add-tag' | 'send-notification' | 'wait'
  config: Record<string, any>
}
