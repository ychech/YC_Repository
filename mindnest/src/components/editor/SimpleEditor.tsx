import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '../../utils/cn'

interface SimpleEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
}

export function SimpleEditor({ content = '', onChange, placeholder = '开始写作...' }: SimpleEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState(content)
  const [isComposing, setIsComposing] = useState(false)

  // 初始化内容
  useEffect(() => {
    if (content !== value && !isComposing) {
      setValue(content)
    }
  }, [content])

  // 处理输入 - 使用textarea避免复杂的contentEditable问题
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    onChange?.(newValue)
  }

  // 处理Tab键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const target = e.target as HTMLTextAreaElement
      const start = target.selectionStart
      const end = target.selectionEnd
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      setValue(newValue)
      onChange?.(newValue)
      // 恢复光标位置
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2
      }, 0)
    }
  }

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [value])

  return (
    <div className="h-full overflow-y-auto">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        placeholder={placeholder}
        className={cn(
          "w-full min-h-full p-8 resize-none outline-none",
          "text-base leading-relaxed",
          "bg-transparent",
          "font-normal text-foreground",
          "placeholder:text-muted-foreground/40"
        )}
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          lineHeight: '1.8',
        }}
        spellCheck={false}
      />
    </div>
  )
}
