import { useState, useEffect, useCallback, useRef } from 'react'

interface SelectionState {
  text: string
  isCollapsed: boolean
  range: Range | null
  rect: DOMRect | null
  position: { x: number; y: number } | null
}

interface UseTextSelectionOptions {
  // 最小选中文本长度
  minLength?: number
  
  // 选择变化时的回调
  onSelectionChange?: (selection: SelectionState) => void
  
  // 是否监听编辑器内的选择
  containerSelector?: string
}

export function useTextSelection(options: UseTextSelectionOptions = {}) {
  const { 
    minLength = 1,
    onSelectionChange,
    containerSelector 
  } = options
  
  const [selection, setSelection] = useState<SelectionState>({
    text: '',
    isCollapsed: true,
    range: null,
    rect: null,
    position: null
  })
  
  const lastSelectionRef = useRef<string>('')
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const updateSelection = useCallback(() => {
    const sel = window.getSelection()
    
    if (!sel || sel.isCollapsed) {
      setSelection(prev => ({
        ...prev,
        text: '',
        isCollapsed: true,
        range: null,
        rect: null,
        position: null
      }))
      return
    }
    
    const text = sel.toString().trim()
    
    // 检查是否在指定容器内
    if (containerSelector) {
      const container = document.querySelector(containerSelector)
      if (container) {
        const anchorNode = sel.anchorNode
        if (anchorNode && !container.contains(anchorNode)) {
          return
        }
      }
    }
    
    // 最小长度检查
    if (text.length < minLength) {
      return
    }
    
    // 避免重复更新相同的选择
    if (text === lastSelectionRef.current) {
      return
    }
    lastSelectionRef.current = text
    
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    
    // 计算工具栏位置（在选区上方居中）
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.top - 10 // 上方 10px 偏移
    }
    
    const newSelection: SelectionState = {
      text,
      isCollapsed: false,
      range,
      rect,
      position
    }
    
    setSelection(newSelection)
    onSelectionChange?.(newSelection)
  }, [minLength, containerSelector, onSelectionChange])
  
  const clearSelection = useCallback(() => {
    lastSelectionRef.current = ''
    setSelection({
      text: '',
      isCollapsed: true,
      range: null,
      rect: null,
      position: null
    })
  }, [])
  
  // 监听选择变化
  useEffect(() => {
    const handleSelectionChange = () => {
      // 延迟更新以避免频繁渲染
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = setTimeout(updateSelection, 100)
    }
    
    // 监听鼠标松开（选择完成）
    const handleMouseUp = (e: MouseEvent) => {
      // 检查是否点击了工具栏内部
      const target = e.target as HTMLElement
      if (target.closest('.ai-selection-toolbar')) {
        return
      }
      
      setTimeout(updateSelection, 10)
    }
    
    document.addEventListener('selectionchange', handleSelectionChange)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      document.removeEventListener('mouseup', handleMouseUp)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [updateSelection])
  
  // 替换选中文本
  const replaceSelection = useCallback((newText: string) => {
    if (!selection.range) return
    
    const sel = window.getSelection()
    if (!sel) return
    
    sel.removeAllRanges()
    sel.addRange(selection.range)
    
    // 删除选中文本并插入新文本
    const range = sel.getRangeAt(0)
    range.deleteContents()
    
    const textNode = document.createTextNode(newText)
    range.insertNode(textNode)
    
    // 移动光标到新文本后
    range.setStartAfter(textNode)
    range.setEndAfter(textNode)
    sel.removeAllRanges()
    sel.addRange(range)
    
    clearSelection()
  }, [selection.range, clearSelection])
  
  // 在选区后插入文本
  const insertAfterSelection = useCallback((text: string) => {
    if (!selection.range) return
    
    const sel = window.getSelection()
    if (!sel) return
    
    sel.removeAllRanges()
    sel.addRange(selection.range)
    
    const range = sel.getRangeAt(0)
    range.collapse(false) // 折叠到末尾
    
    const textNode = document.createTextNode(text)
    range.insertNode(textNode)
    
    range.setStartAfter(textNode)
    range.setEndAfter(textNode)
    sel.removeAllRanges()
    sel.addRange(range)
    
    clearSelection()
  }, [selection.range, clearSelection])
  
  return {
    ...selection,
    clearSelection,
    replaceSelection,
    insertAfterSelection,
    hasSelection: !!selection.text && !selection.isCollapsed
  }
}
