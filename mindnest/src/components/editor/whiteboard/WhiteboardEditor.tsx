import { useState, useRef, useCallback } from 'react'
import type { WhiteboardData, WhiteboardNode, WhiteboardEdge } from '../../../types/document'
import { 
  MousePointer2, 
  Square, 
  Circle, 
  Diamond, 
  Type, 
  StickyNote,
  Minus,
  ZoomIn,
  ZoomOut,
  Hand,
  Undo,
  Redo,
  Grid3X3,
  Network,
  Image as ImageIcon,
  Trash2
} from 'lucide-react'
import { cn } from '../../../utils/cn'

type Tool = 'select' | 'hand' | 'rectangle' | 'ellipse' | 'diamond' | 'text' | 'sticky' | 'line'

interface WhiteboardEditorProps {
  data: WhiteboardData
  onChange: (data: WhiteboardData) => void
}

export function WhiteboardEditor({ data, onChange }: WhiteboardEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedTool, setSelectedTool] = useState<Tool>('select')
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const { nodes = [], edges = [] } = data

  const updateData = (updates: Partial<WhiteboardData>) => {
    onChange({ ...data, ...updates })
  }

  const addNode = (type: WhiteboardNode['type'], x: number, y: number) => {
    const newNode: WhiteboardNode = {
      id: `node_${Date.now()}`,
      type,
      x: (x - pan.x) / zoom,
      y: (y - pan.y) / zoom,
      width: type === 'text' ? 150 : 120,
      height: type === 'text' ? 40 : 80,
      content: type === 'text' ? '双击编辑文本' : '',
      style: {
        backgroundColor: type === 'sticky' ? '#fef3c7' : '#ffffff',
        borderColor: '#6366f1',
        borderWidth: 2,
      }
    }
    updateData({ nodes: [...nodes, newNode] })
    setSelectedNode(newNode.id)
  }

  const handleSvgClick = (e: React.MouseEvent) => {
    if (selectedTool === 'select') {
      setSelectedNode(null)
      return
    }
    
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    switch (selectedTool) {
      case 'rectangle':
        addNode('rectangle', x, y)
        break
      case 'ellipse':
        addNode('ellipse', x, y)
        break
      case 'diamond':
        addNode('diamond', x, y)
        break
      case 'text':
        addNode('text', x, y)
        break
      case 'sticky':
        addNode('sticky', x, y)
        break
    }
    
    setSelectedTool('select')
  }

  const handleNodeDrag = (nodeId: string, dx: number, dy: number) => {
    updateData({
      nodes: nodes.map(n => 
        n.id === nodeId 
          ? { ...n, x: n.x + dx / zoom, y: n.y + dy / zoom }
          : n
      )
    })
  }

  const deleteSelected = () => {
    if (!selectedNode) return
    updateData({
      nodes: nodes.filter(n => n.id !== selectedNode),
      edges: edges.filter(e => e.source !== selectedNode && e.target !== selectedNode)
    })
    setSelectedNode(null)
  }

  const renderNode = (node: WhiteboardNode) => {
    const isSelected = selectedNode === node.id
    const commonProps = {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedNode(node.id)
      },
      onMouseDown: (e: React.MouseEvent) => {
        e.stopPropagation()
        if (selectedTool !== 'select') return
        setIsDragging(true)
        setDragStart({ x: e.clientX, y: e.clientY })
        setSelectedNode(node.id)
        
        const handleMouseMove = (e: MouseEvent) => {
          const dx = e.clientX - dragStart.x
          const dy = e.clientY - dragStart.y
          handleNodeDrag(node.id, dx, dy)
          setDragStart({ x: e.clientX, y: e.clientY })
        }
        
        const handleMouseUp = () => {
          setIsDragging(false)
          window.removeEventListener('mousemove', handleMouseMove)
          window.removeEventListener('mouseup', handleMouseUp)
        }
        
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
      },
      style: {
        filter: isSelected ? 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.5))' : undefined,
        cursor: selectedTool === 'select' ? 'move' : 'pointer'
      }
    }

    const transform = `translate(${node.x}, ${node.y})`

    switch (node.type) {
      case 'rectangle':
      case 'sticky':
        return (
          <g key={node.id} transform={transform} {...commonProps}>
            <rect
              width={node.width}
              height={node.height}
              rx={node.type === 'sticky' ? 4 : 8}
              fill={node.style?.backgroundColor || '#fff'}
              stroke={isSelected ? '#6366f1' : (node.style?.borderColor || '#e5e7eb')}
              strokeWidth={isSelected ? 3 : (node.style?.borderWidth || 2)}
            />
            <foreignObject x={10} y={10} width={node.width - 20} height={node.height - 20}>
              <div className="w-full h-full flex items-center justify-center text-center text-sm break-words overflow-hidden">
                {node.content}
              </div>
            </foreignObject>
          </g>
        )
      
      case 'ellipse':
        return (
          <g key={node.id} transform={transform} {...commonProps}>
            <ellipse
              cx={node.width / 2}
              cy={node.height / 2}
              rx={node.width / 2}
              ry={node.height / 2}
              fill={node.style?.backgroundColor || '#fff'}
              stroke={isSelected ? '#6366f1' : (node.style?.borderColor || '#e5e7eb')}
              strokeWidth={isSelected ? 3 : (node.style?.borderWidth || 2)}
            />
            <foreignObject x={10} y={10} width={node.width - 20} height={node.height - 20}>
              <div className="w-full h-full flex items-center justify-center text-center text-sm">
                {node.content}
              </div>
            </foreignObject>
          </g>
        )
      
      case 'diamond':
        const cx = node.width / 2
        const cy = node.height / 2
        const points = `${cx},0 ${node.width},${cy} ${cx},${node.height} 0,${cy}`
        return (
          <g key={node.id} transform={transform} {...commonProps}>
            <polygon
              points={points}
              fill={node.style?.backgroundColor || '#fff'}
              stroke={isSelected ? '#6366f1' : (node.style?.borderColor || '#e5e7eb')}
              strokeWidth={isSelected ? 3 : (node.style?.borderWidth || 2)}
            />
            <foreignObject x={20} y={20} width={node.width - 40} height={node.height - 40}>
              <div className="w-full h-full flex items-center justify-center text-center text-sm">
                {node.content}
              </div>
            </foreignObject>
          </g>
        )
      
      case 'text':
        return (
          <g key={node.id} transform={transform} {...commonProps}>
            <foreignObject width={node.width} height={node.height}>
              <div 
                className="w-full h-full flex items-center justify-center text-sm font-medium"
                style={{ color: node.style?.color || '#1f2937' }}
              >
                {node.content}
              </div>
            </foreignObject>
            {isSelected && (
              <rect
                width={node.width}
                height={node.height}
                fill="none"
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            )}
          </g>
        )
      
      default:
        return null
    }
  }

  const ToolbarButton = ({ tool, icon: Icon, title }: { tool: Tool; icon: any; title: string }) => (
    <button
      onClick={() => setSelectedTool(tool)}
      title={title}
      className={cn(
        "p-2 rounded-lg transition-all duration-150",
        selectedTool === tool 
          ? "bg-primary text-primary-foreground shadow-sm" 
          : "hover:bg-accent text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="w-5 h-5" />
    </button>
  )

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-1">
          <ToolbarButton tool="select" icon={MousePointer2} title="选择" />
          <ToolbarButton tool="hand" icon={Hand} title="抓手" />
          <div className="w-px h-6 bg-border mx-2" />
          <ToolbarButton tool="rectangle" icon={Square} title="矩形" />
          <ToolbarButton tool="ellipse" icon={Circle} title="圆形" />
          <ToolbarButton tool="diamond" icon={Diamond} title="菱形" />
          <div className="w-px h-6 bg-border mx-2" />
          <ToolbarButton tool="text" icon={Type} title="文本" />
          <ToolbarButton tool="sticky" icon={StickyNote} title="便签" />
          <ToolbarButton tool="line" icon={Minus} title="连线" />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
            className="p-2 hover:bg-accent rounded-lg"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted-foreground w-16 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(3, z + 0.25))}
            className="p-2 hover:bg-accent rounded-lg"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-border mx-2" />
          <button
            onClick={deleteSelected}
            disabled={!selectedNode}
            className="p-2 hover:bg-destructive/10 text-destructive rounded-lg disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 画布 */}
      <div className="flex-1 overflow-hidden relative">
        {/* 网格背景 */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
            `,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        />

        <svg
          ref={svgRef}
          className="w-full h-full"
          onClick={handleSvgClick}
          style={{ cursor: selectedTool === 'hand' ? 'grab' : 'default' }}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* 连线 */}
            {edges.map(edge => {
              const source = nodes.find(n => n.id === edge.source)
              const target = nodes.find(n => n.id === edge.target)
              if (!source || !target) return null
              return (
                <line
                  key={edge.id}
                  x1={source.x + source.width / 2}
                  y1={source.y + source.height / 2}
                  x2={target.x + target.width / 2}
                  y2={target.y + target.height / 2}
                  stroke="#9ca3af"
                  strokeWidth={2}
                />
              )
            })}
            
            {/* 节点 */}
            {nodes.map(renderNode)}
          </g>
        </svg>

        {/* 提示 */}
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur px-3 py-2 rounded-lg border border-border shadow-sm text-sm text-muted-foreground">
          {selectedTool === 'select' && '点击选择元素，拖拽移动'}
          {selectedTool === 'hand' && '拖拽移动画布'}
          {selectedTool === 'rectangle' && '点击画布创建矩形'}
          {selectedTool === 'ellipse' && '点击画布创建圆形'}
          {selectedTool === 'diamond' && '点击画布创建菱形'}
          {selectedTool === 'text' && '点击画布创建文本'}
          {selectedTool === 'sticky' && '点击画布创建便签'}
        </div>
      </div>
    </div>
  )
}
