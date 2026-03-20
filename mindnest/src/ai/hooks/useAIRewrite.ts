import { useState, useCallback } from 'react'
import { aiService } from '../core/AIService'
import type { RewriteStyle } from '../core/types'

interface UseAIRewriteOptions {
  onSuccess?: (result: string) => void
  onError?: (error: Error) => void
}

export function useAIRewrite(options: UseAIRewriteOptions = {}) {
  const { onSuccess, onError } = options
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const rewrite = useCallback(async (
    text: string,
    style: RewriteStyle
  ): Promise<string | null> => {
    if (!text.trim()) return null
    
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await aiService.rewrite(text, style)
      onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      onError?.(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [onSuccess, onError])
  
  const translate = useCallback(async (
    text: string,
    targetLang: string
  ): Promise<string | null> => {
    if (!text.trim()) return null
    
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await aiService.translate(text, targetLang)
      onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      onError?.(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [onSuccess, onError])
  
  const summarize = useCallback(async (
    text: string,
    maxLength?: number
  ): Promise<string | null> => {
    if (!text.trim()) return null
    
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await aiService.summarize(text, { maxLength })
      onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      onError?.(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [onSuccess, onError])
  
  const explain = useCallback(async (
    text: string
  ): Promise<string | null> => {
    if (!text.trim()) return null
    
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await aiService.explain(text)
      onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      onError?.(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [onSuccess, onError])
  
  return {
    isLoading,
    error,
    rewrite,
    translate,
    summarize,
    explain
  }
}
