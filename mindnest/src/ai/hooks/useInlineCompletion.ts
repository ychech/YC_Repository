import { useState, useCallback, useRef, useEffect } from 'react'
import { aiService } from '../core/AIService'
import type { CompletionItem } from '../core/types'

interface UseInlineCompletionOptions {
  // 编辑器内容
  content: string
  
  // 光标位置
  cursorPosition: number
  
  // 自动触发延迟
  debounceMs?: number
  
  // 最小触发长度
  minTriggerLength?: number
  
  // 是否启用
  enabled?: boolean
}

interface InlineCompletionState {
  // 当前建议
  suggestion: CompletionItem | null
  
  // 是否显示
  visible: boolean
  
  // 是否加载中
  loading: boolean
  
  // 在内容中的位置
  position: number
}

export function useInlineCompletion(options: UseInlineCompletionOptions) {
  const {
    content,
    cursorPosition,
    debounceMs = 300,
    minTriggerLength = 3,
    enabled = true
  } = options
  
  const [state, setState] = useState<InlineCompletionState>({
    suggestion: null,
    visible: false,
    loading: false,
    position: cursorPosition
  })
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRequestRef = useRef<number>(0)
  
  // 触发补全
  const triggerCompletion = useCallback(async () => {
    if (!enabled) return
    if (content.length < minTriggerLength) return
    
    // 避免过于频繁的请求
    const now = Date.now()
    if (now - lastRequestRef.current < debounceMs) {
      return
    }
    lastRequestRef.current = now
    
    setState(prev => ({ ...prev, loading: true, position: cursorPosition }))
    
    try {
      const completions = await aiService.complete(content, cursorPosition)
      
      if (completions.length > 0 && completions[0].confidence > 0.5) {
        setState({
          suggestion: completions[0],
          visible: true,
          loading: false,
          position: cursorPosition
        })
      } else {
        setState(prev => ({ ...prev, loading: false, visible: false }))
      }
    } catch (error) {
      console.error('Completion error:', error)
      setState(prev => ({ ...prev, loading: false }))
    }
  }, [content, cursorPosition, enabled, minTriggerLength, debounceMs])
  
  // 防抖触发
  const debouncedTrigger = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(triggerCompletion, debounceMs)
  }, [triggerCompletion, debounceMs])
  
  // 监听内容变化
  useEffect(() => {
    if (!enabled) return
    
    // 只在特定条件下触发（如输入空格、标点后的延迟）
    const lastChar = content[cursorPosition - 1]
    const shouldTrigger = /[\s，。！？；：,.!?;:]$/.test(lastChar || '')
    
    if (shouldTrigger && content.length >= minTriggerLength) {
      debouncedTrigger()
    }
    
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [content, cursorPosition, enabled, minTriggerLength, debouncedTrigger])
  
  // 接受补全
  const acceptCompletion = useCallback(() => {
    if (!state.suggestion || !state.visible) {
      return null
    }
    
    const acceptedText = state.suggestion.text
    
    setState({
      suggestion: null,
      visible: false,
      loading: false,
      position: 0
    })
    
    return acceptedText
  }, [state.suggestion, state.visible])
  
  // 部分接受（按词）
  const acceptPartial = useCallback((wordCount: number) => {
    if (!state.suggestion || !state.visible) {
      return null
    }
    
    const words = state.suggestion.text.split(/\s+/)
    const partialText = words.slice(0, wordCount).join(' ')
    const remainingText = words.slice(wordCount).join(' ')
    
    // 更新剩余建议
    setState(prev => ({
      ...prev,
      suggestion: {
        ...prev.suggestion!,
        text: remainingText
      },
      visible: remainingText.length > 0
    }))
    
    return partialText
  }, [state.suggestion, state.visible])
  
  // 拒绝补全
  const dismissCompletion = useCallback(() => {
    setState({
      suggestion: null,
      visible: false,
      loading: false,
      position: 0
    })
  }, [])
  
  // 显示下一个建议
  const showNextSuggestion = useCallback(async () => {
    // TODO: 实现建议轮换
  }, [])
  
  return {
    // 状态
    suggestion: state.suggestion,
    visible: state.visible,
    loading: state.loading,
    position: state.position,
    
    // 操作
    acceptCompletion,
    acceptPartial,
    dismissCompletion,
    showNextSuggestion,
    triggerCompletion: debouncedTrigger
  }
}
