import { useState, useCallback, useRef } from 'react'
import { aiService } from '../core/AIService'
import type { Message, AIContext, Citation } from '../core/types'

interface UseAIChatOptions {
  documentId?: string
  documentContent?: string
  onError?: (error: Error) => void
}

interface ChatState {
  messages: Message[]
  isLoading: boolean
  error: Error | null
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const { documentId, documentContent, onError } = options
  
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null
  })
  
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // 构建上下文
  const buildContext = useCallback((): AIContext => {
    const recentMessages = state.messages.slice(-6) // 最近 6 条消息
    
    return {
      currentDocument: documentId && documentContent ? {
        id: documentId,
        title: '', // 可从外部传入
        content: documentContent,
        type: 'document'
      } : undefined,
      conversationHistory: recentMessages,
      selectedText: window.getSelection()?.toString()
    }
  }, [documentId, documentContent, state.messages])
  
  // 发送消息
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return
    
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    
    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }
    
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null
    }))
    
    try {
      const context = buildContext()
      const response = await aiService.chat(
        [...state.messages, userMessage],
        context
      )
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        citations: response.citations,
        metadata: response.metadata
      }
      
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false
      }))
      
      return assistantMessage
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err
      }))
      onError?.(err)
      throw err
    }
  }, [buildContext, onError, state.messages])
  
  // 流式发送消息
  const sendMessageStream = useCallback(async (
    content: string,
    onChunk: (chunk: string) => void
  ) => {
    if (!content.trim()) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }
    
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null
    }))
    
    let fullContent = ''
    
    try {
      const context = buildContext()
      
      // 模拟流式响应（实际实现需要后端支持 SSE 或 WebSocket）
      const response = await aiService.chat(
        [...state.messages, userMessage],
        context,
        (chunk) => {
          fullContent += chunk
          onChunk(chunk)
        }
      )
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        citations: response.citations,
        metadata: response.metadata
      }
      
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false
      }))
      
      return assistantMessage
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err
      }))
      onError?.(err)
      throw err
    }
  }, [buildContext, onError, state.messages])
  
  // 快速操作
  const executeQuickAction = useCallback(async (
    action: 'continue' | 'polish' | 'summarize' | 'translate' | 'explain',
    text?: string
  ) => {
    const targetText = text || documentContent || ''
    
    if (!targetText.trim()) return
    
    const actionNames: Record<string, string> = {
      continue: '继续写作',
      polish: '润色',
      summarize: '摘要',
      translate: '翻译',
      explain: '解释'
    }
    
    // 添加系统消息说明操作
    const systemMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `请对以下内容进行${actionNames[action]}:\n\n${targetText.slice(0, 2000)}`,
      timestamp: new Date()
    }
    
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, systemMessage],
      isLoading: true,
      error: null
    }))
    
    try {
      let result = ''
      
      switch (action) {
        case 'continue':
          result = await aiService.complete(targetText, targetText.length, buildContext())
            .then(items => items[0]?.text || '')
          break
        case 'polish':
          result = await aiService.rewrite(targetText, 'professional')
          break
        case 'summarize':
          result = await aiService.summarize(targetText)
          break
        case 'translate':
          result = await aiService.translate(targetText, '英文')
          break
        case 'explain':
          result = await aiService.explain(targetText)
          break
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `**${actionNames[action]}结果：**\n\n${result}`,
        timestamp: new Date()
      }
      
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false
      }))
      
      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err
      }))
      onError?.(err)
      throw err
    }
  }, [buildContext, documentContent, onError])
  
  // 清空对话
  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      error: null
    }))
  }, [])
  
  // 删除单条消息
  const deleteMessage = useCallback((messageId: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.filter(m => m.id !== messageId)
    }))
  }, [])
  
  // 重新生成
  const regenerate = useCallback(async (messageId: string) => {
    const messageIndex = state.messages.findIndex(m => m.id === messageId)
    if (messageIndex <= 0) return
    
    // 找到对应的用户消息
    const userMessage = state.messages[messageIndex - 1]
    if (userMessage.role !== 'user') return
    
    // 删除 AI 回复及之后的消息
    const newMessages = state.messages.slice(0, messageIndex)
    
    setState(prev => ({
      ...prev,
      messages: newMessages,
      isLoading: true
    }))
    
    try {
      const context = buildContext()
      const response = await aiService.chat(newMessages, context)
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        citations: response.citations,
        metadata: response.metadata
      }
      
      setState(prev => ({
        ...prev,
        messages: [...newMessages, assistantMessage],
        isLoading: false
      }))
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err
      }))
      onError?.(err)
    }
  }, [buildContext, onError, state.messages])
  
  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    sendMessageStream,
    executeQuickAction,
    clearMessages,
    deleteMessage,
    regenerate
  }
}
