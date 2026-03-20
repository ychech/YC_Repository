import { invoke } from '@tauri-apps/api/core'
import type { 
  AIRequest, 
  AIResponse, 
  Message, 
  AIContext,
  KnowledgeChunk,
  CompletionItem,
  RewriteOptions,
  TranslateOptions,
  SummarizeOptions,
  Citation
} from './types'

// 模拟知识库检索（后续替换为真实的向量检索）
async function mockKnowledgeSearch(query: string): Promise<KnowledgeChunk[]> {
  // TODO: 接入真实的向量数据库
  return []
}

// 构建增强提示词
function buildEnhancedPrompt(
  request: AIRequest, 
  knowledgeChunks: KnowledgeChunk[]
): string {
  const { type, content, context } = request
  
  let prompt = ''
  
  // 系统提示词
  prompt += `你是一个智能知识管理助手，帮助用户更好地组织和创作内容。\n\n`
  
  // 添加上下文
  if (context?.currentDocument) {
    prompt += `当前文档: ${context.currentDocument.title}\n`
    prompt += `文档类型: ${context.currentDocument.type}\n\n`
  }
  
  // 添加相关知识
  if (knowledgeChunks.length > 0) {
    prompt += `参考知识:\n`
    knowledgeChunks.forEach((chunk, index) => {
      prompt += `[${index + 1}] ${chunk.documentTitle}:\n${chunk.content}\n\n`
    })
  }
  
  // 添加用户请求
  switch (type) {
    case 'chat':
      prompt += `用户问题: ${content}\n`
      break
    case 'completion':
      prompt += `请基于以下内容继续写作:\n${content}\n`
      break
    case 'rewrite':
      prompt += `请重写以下内容:\n${content}\n`
      break
    case 'summarize':
      prompt += `请总结以下内容:\n${content}\n`
      break
    case 'translate':
      prompt += `请翻译以下内容:\n${content}\n`
      break
    case 'explain':
      prompt += `请解释以下内容:\n${content}\n`
      break
  }
  
  return prompt
}

class AIService {
  private static instance: AIService
  private abortController: AbortController | null = null
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }
  
  // 中止当前请求
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }
  
  // 智能路由：本地还是云端
  private async routeRequest(request: AIRequest): Promise<'local' | 'cloud'> {
    // 简单启发式：复杂任务用云端，简单任务可尝试本地
    const complexity = this.assessComplexity(request)
    
    // 检查本地模型是否可用
    const localAvailable = await this.checkLocalModel()
    
    if (complexity === 'low' && localAvailable) {
      return 'local'
    }
    
    return 'cloud'
  }
  
  private assessComplexity(request: AIRequest): 'low' | 'medium' | 'high' {
    const { type, content } = request
    
    // 基于任务类型和内容长度评估复杂度
    if (type === 'completion' && content.length < 500) {
      return 'low'
    }
    
    if (type === 'chat' && content.length < 200) {
      return 'low'
    }
    
    if (content.length > 2000) {
      return 'high'
    }
    
    return 'medium'
  }
  
  private async checkLocalModel(): Promise<boolean> {
    try {
      // TODO: 检查本地模型服务状态
      return false
    } catch {
      return false
    }
  }
  
  // 主对话方法
  async chat(
    messages: Message[],
    context?: AIContext,
    onStream?: (chunk: string) => void
  ): Promise<AIResponse> {
    this.abortController = new AbortController()
    
    try {
      // 构建请求
      const request: AIRequest = {
        id: Date.now().toString(),
        type: 'chat',
        content: messages[messages.length - 1]?.content || '',
        context,
        options: {
          stream: !!onStream,
          temperature: 0.7,
          maxTokens: 2000
        }
      }
      
      // 检索相关知识
      const knowledgeChunks = await mockKnowledgeSearch(request.content)
      
      // 构建增强提示
      const enhancedPrompt = buildEnhancedPrompt(request, knowledgeChunks)
      
      // 调用后端 AI
      const response = await invoke<{
        content: string
        tokensUsed: number
      }>('chat_with_context', {
        messages: [
          ...messages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: enhancedPrompt }
        ],
        contextDocIds: context?.currentDocument ? [context.currentDocument.id] : []
      })
      
      // 生成引用
      const citations: Citation[] = knowledgeChunks.map((chunk, index) => ({
        id: `cite-${index}`,
        source: 'document',
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        content: chunk.content,
        relevanceScore: chunk.relevanceScore
      }))
      
      return {
        id: Date.now().toString(),
        content: response.content,
        citations: citations.length > 0 ? citations : undefined,
        metadata: {
          model: 'default',
          tokensUsed: response.tokensUsed,
          processingTime: 0
        }
      }
    } finally {
      this.abortController = null
    }
  }
  
  // 内联续写
  async complete(
    content: string,
    cursorPosition: number,
    context?: AIContext
  ): Promise<CompletionItem[]> {
    try {
      const textBefore = content.slice(0, cursorPosition)
      const textAfter = content.slice(cursorPosition)
      
      const response = await invoke<{
        suggestions: string[]
      }>('get_suggestions', {
        content: textBefore,
        cursorPosition
      })
      
      return response.suggestions.map((text, index) => ({
        id: `comp-${index}`,
        text,
        confidence: 0.8 - index * 0.1,
        type: 'continuation'
      }))
    } catch (error) {
      console.error('Completion error:', error)
      return []
    }
  }
  
  // 重写文本
  async rewrite(
    text: string,
    style: RewriteOptions['style']
  ): Promise<string> {
    const stylePrompts: Record<string, string> = {
      formal: '用正式、学术的风格重写：',
      casual: '用轻松、口语化的风格重写：',
      concise: '简化表达，使其更简洁：',
      elaborate: '扩展细节，使其更详细：',
      professional: '用专业的商务风格重写：',
      creative: '用有创意的文学风格重写：'
    }
    
    try {
      const response = await invoke<{ content: string }>('generate_completion', {
        prompt: `${stylePrompts[style]}\n\n${text}`,
        context: '',
        model: null,
        temperature: 0.7
      })
      
      return response.content
    } catch (error) {
      console.error('Rewrite error:', error)
      return text
    }
  }
  
  // 翻译
  async translate(
    text: string,
    targetLang: string
  ): Promise<string> {
    try {
      const response = await invoke<{ content: string }>('generate_completion', {
        prompt: `将以下文本翻译成${targetLang}:\n\n${text}`,
        context: '',
        model: null,
        temperature: 0.3
      })
      
      return response.content
    } catch (error) {
      console.error('Translate error:', error)
      return text
    }
  }
  
  // 摘要
  async summarize(
    text: string,
    options: SummarizeOptions = {}
  ): Promise<string> {
    const { maxLength = 200, format = 'paragraph' } = options
    
    const formatPrompts: Record<string, string> = {
      paragraph: `请用${maxLength}字以内的段落总结：`,
      bullet: `请用要点形式总结（最多5点）：`,
      outline: `请用大纲形式总结：`
    }
    
    try {
      const response = await invoke<{ content: string }>('generate_completion', {
        prompt: `${formatPrompts[format]}\n\n${text}`,
        context: '',
        model: null,
        temperature: 0.5
      })
      
      return response.content
    } catch (error) {
      console.error('Summarize error:', error)
      return text.slice(0, maxLength) + '...'
    }
  }
  
  // 解释
  async explain(text: string): Promise<string> {
    try {
      const response = await invoke<{ content: string }>('generate_completion', {
        prompt: `请用简单易懂的语言解释以下概念:\n\n${text}\n\n解释：`,
        context: '',
        model: null,
        temperature: 0.7
      })
      
      return response.content
    } catch (error) {
      console.error('Explain error:', error)
      return '无法解释该内容'
    }
  }
  
  // 生成标签建议
  async suggestTags(
    content: string,
    existingTags: string[]
  ): Promise<string[]> {
    try {
      const response = await invoke<{ content: string }>('generate_completion', {
        prompt: `基于以下内容，建议3-5个标签（用逗号分隔，不要与已有标签重复）：\n\n已有标签: ${existingTags.join(', ')}\n\n内容: ${content.slice(0, 1000)}\n\n建议标签:`,
        context: '',
        model: null,
        temperature: 0.5
      })
      
      return response.content
        .split(/[,，]/)
        .map(tag => tag.trim())
        .filter(tag => tag && !existingTags.includes(tag))
        .slice(0, 5)
    } catch (error) {
      console.error('Tag suggestion error:', error)
      return []
    }
  }
  
  // 查找相关文档
  async findRelated(documentId: string, content: string): Promise<Array<{
    documentId: string
    title: string
    similarity: number
  }>> {
    // TODO: 接入向量检索
    return []
  }
}

export const aiService = AIService.getInstance()
