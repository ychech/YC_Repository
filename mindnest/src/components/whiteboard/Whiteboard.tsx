// 简化版白板组件
import { useState, useRef, useEffect } from 'react'
import type { WhiteboardData, WhiteboardElement, WhiteboardElementType } from './types'

interface WhiteboardProps {
  initialData?: WhiteboardData
  onChange?: (data: WhiteboardData) => void
  className?: string
  readOnly?: boolean
}

export function Whiteboard({ initialData, onChange, className = '', readOnly = false }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 画布状态
  const [elements, setElements] = useState<WhiteboardElement[]>(initialData?.elements || [])
  const [zoom, setZoom] = useState(initialData?.appState?.zoom || 1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const dragStartRef = useRef({ x: 0, y: 0, elX: 0, elY: 0 })
  
  // 初始化画布
  useEffect(() => {
    if (initialData) {
      setElements(initialData.elements || [])
      setZoom(initialData.appState?.zoom || 1)
    }
  }, [initialData])
  
  // 保存状态
  useEffect(() => {
    onChange?.({ elements, appState: { zoom, viewBackgroundColor: '#ffffff' } })
  }, [elements, zoom])
  
  // 绘制画布
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 清空画布
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // 绘制网格
    ctx.strokeStyle = '#e5e5e5'
    ctx.lineWidth = 1
    const gridSize = 20 * zoom
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
    
    // 绘制元素
    ctx.save()
    ctx.translate(offset.x, offset.y)
    ctx.scale(zoom, zoom)
    
    elements.forEach(el => {
      ctx.strokeStyle = el.strokeColor || '#333333'
      ctx.fillStyle = el.backgroundColor || 'transparent'
      ctx.lineWidth = el.strokeWidth || 2
      
      switch (el.type) {
        case 'rectangle':
        case 'diamond':
          ctx.fillRect(el.x, el.y, el.width, el.height)
          ctx.strokeRect(el.x, el.y, el.width, el.height)
          break
        case 'ellipse':
          ctx.beginPath()
          ctx.ellipse(el.x + el.width/2, el.y + el.height/2, el.width/2, el.height/2, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          break
        case 'text':
        case 'sticky':
          ctx.font = `${el.fontSize || 20}px sans-serif`
          ctx.fillStyle = el.strokeColor || '#333333'
          ctx.fillText(el.text || '', el.x, el.y + (el.fontSize || 20))
          break
        case 'arrow':
        case 'line':
          if (el.points && el.points.length > 1) {
            ctx.beginPath()
            ctx.moveTo(el.points[0].x, el.points[0].y)
            el.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
            ctx.stroke()
          }
          break
      }
      
      // 选中高亮
      if (el.id === selectedId) {
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(el.x - 4, el.y - 4, el.width + 8, el.height + 8)
        ctx.setLineDash([])
      }
    })
    
    ctx.restore()
  }, [elements, zoom, offset, selectedId])
  
  // 添加元素
  const addElement = (type: Exclude<WhiteboardElementType, 'selection'>) => {
    const now = Date.now()
    const newEl: WhiteboardElement = {
      id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      x: 100 + Math.random() * 50,
      y: 100 + Math.random() * 50,
      width: type === 'text' ? 200 : type === 'sticky' ? 150 : 120,
      height: type === 'text' ? 40 : type === 'sticky' ? 120 : 100,
      text: type === 'text' ? '双击编辑' : type === 'sticky' ? '' : undefined,
      strokeColor: '#333333',
      backgroundColor: type === 'rectangle' || type === 'diamond' || type === 'sticky' ? '#f3f4f6' : 'transparent',
      strokeWidth: 2,
      fontSize: 16,
      version: 1,
      versionNonce: Math.random(),
      updated: now
    }
    setElements(prev => [...prev, newEl])
    setSelectedId(newEl.id)
  }
  
  // 鼠标事件处理
  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = (e.clientX - rect.left - offset.x) / zoom
    const y = (e.clientY - rect.top - offset.y) / zoom
    
    // 查找点击的元素（倒序，选中最上面的）
    const clicked = [...elements].reverse().find(el => 
      x >= el.x && x <= el.x + el.width &&
      y >= el.y && y <= el.y + el.height
    )
    
    if (clicked) {
      setSelectedId(clicked.id)
      setIsDragging(true)
      dragStartRef.current = { 
        x: e.clientX, 
        y: e.clientY, 
        elX: clicked.x, 
        elY: clicked.y 
      }
    } else {
      setSelectedId(null)
    }
  }
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedId) return
    
    const dx = (e.clientX - dragStartRef.current.x) / zoom
    const dy = (e.clientY - dragStartRef.current.y) / zoom
    
    setElements(prev => prev.map(el => 
      el.id === selectedId
        ? { 
            ...el, 
            x: dragStartRef.current.elX + dx, 
            y: dragStartRef.current.elY + dy,
            updated: Date.now()
          }
        : el
    ))
  }
  
  const handleMouseUp = () => {
    setIsDragging(false)
  }
  
  return (
    <div ref={containerRef} className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* 工具栏 */}
      {!readOnly && (
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
          <button onClick={() => addElement('rectangle')} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors">
            矩形
          </button>
          <button onClick={() => addElement('ellipse')} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors">
            圆形
          </button>
          <button onClick={() => addElement('diamond')} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors">
            菱形
          </button>
          <button onClick={() => addElement('text')} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors">
            文本
          </button>
          <button onClick={() => addElement('sticky')} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors">
            便签
          </button>
          <div className="w-px h-5 bg-gray-300 mx-2" />
          <button 
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            -
          </button>
          <span className="text-sm text-gray-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button 
            onClick={() => setZoom(z => Math.min(3, z + 0.1))}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            +
          </button>
          <button 
            onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }) }}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
          >
            重置
          </button>
          {selectedId && (
            <button 
              onClick={() => { setElements(e => e.filter(el => el.id !== selectedId)); setSelectedId(null) }}
              className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded text-sm transition-colors"
            >
              删除
            </button>
          )}
        </div>
      )}
      
      {/* 画布区域 */}
      <div className="flex-1 overflow-auto p-4 bg-gray-100">
        <canvas
          ref={canvasRef}
          width={2000}
          height={1500}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="bg-white shadow-lg"
          style={{ cursor: isDragging ? 'grabbing' : 'default' }}
        />
      </div>
      
      {/* 状态栏 */}
      <div className="px-4 py-1.5 bg-white border-t border-gray-200 text-xs text-gray-500 flex justify-between">
        <span>元素: {elements.length}</span>
        <span>{selectedId ? `选中: ${selectedId.slice(0, 8)}...` : '未选中'}</span>
      </div>
    </div>
  )
}
