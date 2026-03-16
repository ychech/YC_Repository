import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDocumentStore } from '../stores/document'
import { FileText, Link2, ArrowLeft } from 'lucide-react'
import { cn } from '../utils/cn'
import { parseWikiLinks } from './editor/extensions/WikiLink'

interface BacklinksPanelProps {
  currentDocId: string
  className?: string
}

export function BacklinksPanel({ currentDocId, className }: BacklinksPanelProps) {
  const navigate = useNavigate()
  const { documents, currentDocument } = useDocumentStore()

  // 计算反向链接
  const backlinks = useMemo(() => {
    const currentDoc = documents.find(d => d.id === currentDocId)
    if (!currentDoc) return []

    const targetTitle = currentDoc.title
    const linkedDocs: Array<{
      doc: typeof currentDoc
      context: string
    }> = []

    // 遍历所有文档，查找包含当前文档标题的 WikiLink
    documents.forEach(doc => {
      if (doc.id === currentDocId) return // 跳过自己

      const content = doc.content || ''
      const parts = parseWikiLinks(content)
      
      // 检查是否有链接指向当前文档
      const hasLink = parts.some(part => 
        part.type === 'link' && 
        part.title && (
          part.title === targetTitle || 
          part.title.toLowerCase() === targetTitle.toLowerCase()
        )
      )

      if (hasLink) {
        // 提取上下文（链接所在的段落）
        const lines = content.split('\n')
        let context = ''
        for (const line of lines) {
          if (line.includes(`[[${targetTitle}`) || line.includes(`[[${targetTitle.toLowerCase()}`)) {
            context = line.trim()
            break
          }
        }
        
        linkedDocs.push({ doc, context: context.slice(0, 100) })
      }
    })

    return linkedDocs
  }, [documents, currentDocId])

  // 计算当前文档的出站链接
  const outboundLinks = useMemo(() => {
    const currentDoc = documents.find(d => d.id === currentDocId)
    if (!currentDoc?.content) return []

    const parts = parseWikiLinks(currentDoc.content)
    const links = parts
      .filter(part => part.type === 'link' && part.title)
      .map(part => {
        const linkedDoc = documents.find(d => 
          d.title === part.title || 
          d.title.toLowerCase() === part.title?.toLowerCase()
        )
        return {
          title: part.title!,
          docId: linkedDoc?.id,
          exists: !!linkedDoc,
        }
      })

    // 去重
    const seen = new Set<string>()
    return links.filter(link => {
      if (seen.has(link.title)) return false
      seen.add(link.title)
      return true
    })
  }, [documents, currentDocId])

  if (!currentDocument) return null

  return (
    <div className={cn("space-y-6", className)}>
      {/* 反向链接 */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            反向链接
            {backlinks.length > 0 && (
              <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                {backlinks.length}
              </span>
            )}
          </h3>
        </div>

        {backlinks.length === 0 ? (
          <div className="text-sm text-muted-foreground/60 py-4 text-center bg-muted/30 rounded-lg">
            暂无反向链接
          </div>
        ) : (
          <div className="space-y-2">
            {backlinks.map(({ doc, context }) => (
              <motion.button
                key={doc.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/doc/${doc.id}`)}
                className="w-full text-left p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-sm truncate">{doc.title}</span>
                </div>
                {context && (
                  <p className="text-xs text-muted-foreground line-clamp-2 pl-6">
                    {context}
                  </p>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </section>

      {/* 出站链接 */}
      {outboundLinks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">
              链接到
              <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                {outboundLinks.length}
              </span>
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {outboundLinks.map((link) => (
              <button
                key={link.title}
                onClick={() => link.docId && navigate(`/doc/${link.docId}`)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors",
                  link.exists
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
                    : "bg-muted text-muted-foreground border border-dashed border-border"
                )}
              >
                {link.exists ? (
                  <FileText className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-3.5 h-3.5 flex items-center justify-center text-xs">?</span>
                )}
                {link.title}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
