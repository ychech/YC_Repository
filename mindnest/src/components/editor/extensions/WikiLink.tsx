import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDocumentStore } from '../../../stores/document'
import { FileText, Loader2 } from 'lucide-react'
import { cn } from '../../../utils/cn'

interface WikiLinkProps {
  title: string
  docId?: string
}

// WikiLink 组件 - 可点击的链接，支持悬浮预览
export function WikiLink({ title, docId }: WikiLinkProps) {
  const navigate = useNavigate()
  const { documents, loadDocument } = useDocumentStore()
  const [isHovered, setIsHovered] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const containerRef = useRef<HTMLSpanElement>(null)

  // 查找目标文档
  const targetDoc = docId 
    ? documents.find(d => d.id === docId)
    : documents.find(d => d.title === title)

  const handleClick = () => {
    if (targetDoc) {
      navigate(`/doc/${targetDoc.id}`)
    } else {
      // 文档不存在，询问是否创建
      if (confirm(`文档 "${title}" 不存在。是否创建？`)) {
        // TODO: 创建新文档并跳转
      }
    }
  }

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    
    hoverTimeoutRef.current = setTimeout(async () => {
      if (targetDoc && !previewDoc) {
        setIsLoading(true)
        // 加载文档内容用于预览
        const doc = await loadDocument(targetDoc.id)
        setPreviewDoc(doc)
        setIsLoading(false)
      }
      setIsHovered(true)
    }, 300) // 延迟 300ms 显示预览
  }, [targetDoc, previewDoc, loadDocument])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
    }, 200)
  }, [])

  return (
    <span 
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        onClick={handleClick}
        className={cn(
          "cursor-pointer rounded px-1 transition-colors",
          targetDoc 
            ? "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" 
            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border-b border-dashed border-gray-300"
        )}
      >
        {targetDoc ? title : `${title} (未创建)`}
      </span>

      {/* 悬浮预览 */}
      <AnimatePresence>
        {isHovered && targetDoc && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 z-50 w-80"
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
            }}
            onMouseLeave={handleMouseLeave}
          >
            <div className="bg-popover border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* 预览头部 */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{targetDoc.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {targetDoc.meta?.wordCount || 0} 字 · {targetDoc.meta?.readingTime || 1} 分钟
                  </div>
                </div>
              </div>

              {/* 预览内容 */}
              <div className="p-4 max-h-48 overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : previewDoc?.content ? (
                  <div className="text-sm text-muted-foreground line-clamp-6">
                    {previewDoc.content.slice(0, 200)}
                    {previewDoc.content.length > 200 && '...'}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    文档内容为空
                  </div>
                )}
              </div>

              {/* 操作提示 */}
              <div className="px-4 py-2 bg-muted/30 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
                <span>点击进入文档</span>
                {previewDoc?.isFavorite && (
                  <span className="text-gray-500">⭐ 已收藏</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

// 解析文本中的 WikiLink
export function parseWikiLinks(text: string): Array<{ type: 'text' | 'link'; content: string; title?: string }> {
  const parts: Array<{ type: 'text' | 'link'; content: string; title?: string }> = []
  const regex = /\[\[([^\]]+)\]\]/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    // 添加链接前的文本
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      })
    }

    // 添加链接
    parts.push({
      type: 'link',
      content: match[0],
      title: match[1].trim()
    })

    lastIndex = match.index + match[0].length
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex)
    })
  }

  return parts
}

// 带 WikiLink 渲染的文本组件
export function WikiText({ content, className }: { content: string; className?: string }) {
  const parts = parseWikiLinks(content)

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'link' && part.title) {
          return <WikiLink key={index} title={part.title} />
        }
        return <span key={index}>{part.content}</span>
      })}
    </span>
  )
}
