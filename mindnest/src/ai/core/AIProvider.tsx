import React, { createContext, useContext, useCallback, useState } from 'react'
import type { RewriteStyle, Message } from './types'
import { aiService } from './AIService'

interface AIContextValue {
  // 全局状态
  isProcessing: boolean
  error: Error | null
  
  // 内联编辑
  rewrite: (text: string, style: RewriteStyle) => Promise<string | null>
  translate: (text: string, targetLang: string) => Promise<string | null>
  summarize: (text: string, maxLength?: number) => Promise<string | null>
  explain: (text: string) => Promise<string | null>
  
  // 文档操作
  suggestTags: (content: string, existingTags: string[]) => Promise<string[]>
  findRelated: (documentId: string, content: string) => Promise<Array<{
    documentId: string
    title: string
    similarity: number
  }>>
  
  // 聊天
  chat: (messages: Message[], context?: any) => Promise<any>
  
  // 续写
  complete: (content: string, cursorPosition: number) => Promise<string[]>
}

const AIContext = createContext<AIContextValue | null>(null)

export function useAI() {
  const context = useContext(AIContext)
  if (!context) {
    throw new Error('useAI must be used within AIProvider')
  }
  return context
}

interface AIProviderProps {
  children: React.ReactNode
}

export function AIProvider({ children }: AIProviderProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const wrapAsync = useCallback(async <T,>(
    fn: () => Promise<T>
  ): Promise<T | null> => {
    setIsProcessing(true)
    setError(null)
    
    try {
      const result = await fn()
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      console.error('AI operation failed:', error)
      return null
    } finally {
      setIsProcessing(false)
    }
  }, [])
  
  const value: AIContextValue = {
    isProcessing,
    error,
    
    rewrite: useCallback(async (text, style) => {
      return wrapAsync(() => aiService.rewrite(text, style))
    }, [wrapAsync]),
    
    translate: useCallback(async (text, targetLang) => {
      return wrapAsync(() => aiService.translate(text, targetLang))
    }, [wrapAsync]),
    
    summarize: useCallback(async (text, maxLength) => {
      return wrapAsync(() => aiService.summarize(text, { maxLength }))
    }, [wrapAsync]),
    
    explain: useCallback(async (text) => {
      return wrapAsync(() => aiService.explain(text))
    }, [wrapAsync]),
    
    suggestTags: useCallback(async (content, existingTags) => {
      return wrapAsync(() => aiService.suggestTags(content, existingTags))
        .then(result => result || [])
    }, [wrapAsync]),
    
    findRelated: useCallback(async (documentId, content) => {
      return wrapAsync(() => aiService.findRelated(documentId, content))
        .then(result => result || [])
    }, [wrapAsync]),
    
    chat: useCallback(async (messages, context) => {
      return wrapAsync(() => aiService.chat(messages, context))
    }, [wrapAsync]),
    
    complete: useCallback(async (content, cursorPosition) => {
      const items = await wrapAsync(() => 
        aiService.complete(content, cursorPosition)
      )
      return items?.map(i => i.text) || []
    }, [wrapAsync])
  }
  
  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  )
}
