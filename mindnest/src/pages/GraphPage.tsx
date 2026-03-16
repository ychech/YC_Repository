import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Filter, Search, ZoomIn, ZoomOut, Maximize, FileText, ArrowLeft, GitBranch } from 'lucide-react'
import { useDocumentStore } from '../stores/document'
import { cn } from '../utils/cn'
import { parseWikiLinks } from '../components/editor/extensions/WikiLink'

interface GraphNode {
  id: string
  name: string
  x: number
  y: number
  size: number
  color: string
  type: 'document' | 'spreadsheet' | 'whiteboard' | 'note'
}

interface GraphEdge {
  from: string
  to: string
}

const typeColors: Record<string, string> = {
  document: '#6366F1',    // 蓝色
  spreadsheet: '#10B981', // 绿色
  whiteboard: '#8B5CF6',  // 紫色
  note: '#F59E0B',        // 橙色
}

export function GraphPage() {
  const navigate = useNavigate()
  const { documents } = useDocumentStore()
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 })
  const svgRef = useRef<SVGSVGElement>(null)
  const dragStart = useRef({ x: 0, y: 0 })

  // 从文档生成图谱数据
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>()
    const edgeList: GraphEdge[] = []
    const links = new Map<string, Set<string>>()

    // 第一步：创建所有文档节点
    documents.forEach((doc, index) => {
      // 使用极坐标分布，让节点呈圆形排列
      const angle = (index / Math.max(documents.length, 1)) * 2 * Math.PI
      const radius = 200 + Math.random() * 100 // 随机半径增加自然感
      
      nodeMap.set(doc.id, {
        id: doc.id,
        name: doc.title || '无标题',
        x: 400 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius,
        size: 20 + (doc.meta?.wordCount || 0) / 100, // 根据字数调整大小
        color: typeColors[doc.type] || '#6366F1',
        type: doc.type,
      })

      // 收集出站链接
      const content = doc.content || ''
      const parts = parseWikiLinks(content)
      
      parts.forEach(part => {
        if (part.type === 'link' && part.title) {
          // 查找目标文档
          const targetDoc = documents.find(d => 
            d.title === part.title || 
            d.title.toLowerCase() === part.title?.toLowerCase()
          )
          
          if (targetDoc) {
            // 记录链接关系
            if (!links.has(doc.id)) {
              links.set(doc.id, new Set())
            }
            links.get(doc.id)!.add(targetDoc.id)
          }
        }
      })
    })

    // 第二步：创建边
    links.forEach((targets, fromId) => {
      targets.forEach(toId => {
        edgeList.push({ from: fromId, to: toId })
      })
    })

    return { nodes: Array.from(nodeMap.values()), edges: edgeList }
  }, [documents])

  // 筛选节点
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return nodes
    return nodes.filter(n => 
      n.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [nodes, searchQuery])

  // 处理拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsDragging(true)
      dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 选中节点对应的文档
  const selectedDoc = selectedNode ? documents.find(d => d.id === selectedNode) : null

  // 计算相关连接
  const relatedEdges = selectedNode 
    ? edges.filter(e => e.from === selectedNode || e.to === selectedNode)
    : []

  if (documents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <GitBranch className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold mb-2">知识图谱</h2>
          <p className="text-muted-foreground mb-4">创建文档后将自动生成本知识图谱</p>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* Graph Area */}
      <div className="flex-1 relative bg-muted/30 overflow-hidden">
        {/* Header */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 bg-card/90 backdrop-blur border border-border rounded-lg shadow-lg hover:bg-accent"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-semibold">知识图谱</h1>
            <p className="text-xs text-muted-foreground">
              {nodes.length} 个节点 · {edges.length} 个连接
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 max-w-md w-full px-4 z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索节点..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card/90 backdrop-blur border border-border rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Graph Controls */}
        <div className="absolute bottom-4 left-4 flex gap-2 z-10">
          <button 
            onClick={() => setScale(s => Math.min(s + 0.1, 2))}
            className="p-2 bg-card border border-border rounded-lg shadow-lg hover:bg-accent"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setScale(s => Math.max(s - 0.1, 0.5))}
            className="p-2 bg-card border border-border rounded-lg shadow-lg hover:bg-accent"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button 
            onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
            className="p-2 bg-card border border-border rounded-lg shadow-lg hover:bg-accent"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>

        {/* SVG Graph */}
        <svg 
          ref={svgRef}
          className={cn(
            "w-full h-full",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          style={{ 
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* 背景网格 */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" className="fill-border/30" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Edges */}
          {edges.map((edge, i) => {
            const from = nodes.find(n => n.id === edge.from)
            const to = nodes.find(n => n.id === edge.to)
            if (!from || !to) return null
            
            // 高亮与选中节点相关的边
            const isHighlighted = selectedNode && 
              (edge.from === selectedNode || edge.to === selectedNode)
            
            return (
              <motion.line
                key={i}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: isHighlighted ? 1 : 0.3 }}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={isHighlighted ? "#6366F1" : "currentColor"}
                strokeWidth={isHighlighted ? 3 : 2}
                strokeDasharray={isHighlighted ? "0" : "5,5"}
              />
            )
          })}
          
          {/* Nodes */}
          <AnimatePresence>
            {filteredNodes.map((node) => {
              const isSelected = selectedNode === node.id
              const isDimmed = searchQuery && !node.name.toLowerCase().includes(searchQuery.toLowerCase())
              
              return (
                <motion.g 
                  key={node.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: isSelected ? 1.2 : 1, 
                    opacity: isDimmed ? 0.3 : 1 
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedNode(node.id)
                  }}
                >
                  {/* 选中光环 */}
                  {isSelected && (
                    <circle
                      r={node.size + 8}
                      fill="none"
                      stroke="#6366F1"
                      strokeWidth={2}
                      opacity={0.5}
                    />
                  )}
                  
                  {/* 节点圆圈 */}
                  <circle
                    r={node.size}
                    fill={node.color}
                    opacity={isSelected ? 1 : 0.85}
                    stroke="white"
                    strokeWidth={3}
                    className="drop-shadow-lg"
                  />
                  
                  {/* 文档图标 */}
                  <foreignObject x={-8} y={-8} width={16} height={16}>
                    <div className="flex items-center justify-center w-full h-full text-white">
                      <FileText className="w-4 h-4" />
                    </div>
                  </foreignObject>
                  
                  {/* 节点名称 */}
                  <text
                    y={node.size + 18}
                    textAnchor="middle"
                    className={cn(
                      "text-sm font-medium fill-current",
                      isSelected && "font-bold"
                    )}
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.name.length > 12 
                      ? node.name.slice(0, 12) + '...' 
                      : node.name}
                  </text>
                </motion.g>
              )
            })}
          </AnimatePresence>
        </svg>
      </div>

      {/* Sidebar */}
      <div className="w-80 border-l border-border bg-card/50 p-4 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4" />
          <h2 className="font-semibold">图谱信息</h2>
        </div>
        
        <AnimatePresence mode="wait">
          {selectedDoc ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* 文档信息卡片 */}
              <div 
                className="p-4 border rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                style={{ borderColor: typeColors[selectedDoc.type], backgroundColor: `${typeColors[selectedDoc.type]}15` }}
                onClick={() => navigate(`/doc/${selectedDoc.id}`)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: typeColors[selectedDoc.type] }}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{selectedDoc.title}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{selectedDoc.type}</p>
                  </div>
                </div>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p>{selectedDoc.meta?.wordCount || 0} 字 · {selectedDoc.meta?.readingTime || 1} 分钟阅读</p>
                  <p>更新于 {new Date(selectedDoc.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              {/* 相关连接 */}
              {relatedEdges.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-sm">相关文档 ({relatedEdges.length})</h4>
                  <div className="space-y-1">
                    {relatedEdges.map((edge, i) => {
                      const isOutgoing = edge.from === selectedNode
                      const relatedId = isOutgoing ? edge.to : edge.from
                      const related = documents.find(d => d.id === relatedId)
                      if (!related) return null
                      
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedNode(relatedId)}
                          className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-lg text-sm text-left group"
                        >
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            isOutgoing 
                              ? "bg-blue-100 text-blue-700" 
                              : "bg-green-100 text-green-700"
                          )}>
                            {isOutgoing ? '链接到' : '被链接'}
                          </span>
                          <span className="flex-1 truncate">{related.title}</span>
                          <Share2 className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedNode(null)}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                ← 返回概览
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* 统计信息 */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 bg-card border border-border rounded-lg text-center">
                  <div className="text-2xl font-bold">{nodes.length}</div>
                  <div className="text-xs text-muted-foreground">文档节点</div>
                </div>
                <div className="p-3 bg-card border border-border rounded-lg text-center">
                  <div className="text-2xl font-bold">{edges.length}</div>
                  <div className="text-xs text-muted-foreground">双向链接</div>
                </div>
              </div>

              {/* 类型分布 */}
              <div className="mb-6">
                <h4 className="font-medium mb-3 text-sm">类型分布</h4>
                <div className="space-y-2">
                  {Object.entries(typeColors).map(([type, color]) => {
                    const count = documents.filter(d => d.type === type).length
                    if (count === 0) return null
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-sm capitalize">
                            {type === 'document' && '文档'}
                            {type === 'spreadsheet' && '数据表'}
                            {type === 'whiteboard' && '画板'}
                            {type === 'note' && '小记'}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 最近更新 */}
              <div>
                <h4 className="font-medium mb-3 text-sm">最近更新</h4>
                <div className="space-y-1">
                  {[...documents]
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .slice(0, 5)
                    .map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedNode(doc.id)}
                        className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-lg text-sm text-left"
                      >
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: typeColors[doc.type] }}
                        />
                        <span className="flex-1 truncate">{doc.title}</span>
                      </button>
                    ))}
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  💡 提示：在文档中使用 [[文档名]] 创建双向链接，自动构建知识网络
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
