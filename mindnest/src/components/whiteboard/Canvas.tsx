/**
 * 画板画布渲染引擎
 * 使用 Canvas 2D API 进行高性能渲染
 */

import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { cn } from '../../utils/cn'
import type { WhiteboardElement, WhiteboardAppState, Point } from './types'
import { DEFAULT_ELEMENT_STYLES } from './types'

interface CanvasProps {
  elements: WhiteboardElement[]
  appState: WhiteboardAppState
  onCanvasPointerDown: (e: React.PointerEvent) => void
  onCanvasPointerMove: (e: React.PointerEvent) => void
  onCanvasPointerUp: (e: React.PointerEvent) => void
  onCanvasDoubleClick: (e: React.MouseEvent) => void
  onWheel: (e: React.WheelEvent) => void
  className?: string
}

export interface CanvasRef {
  getCanvas: () => HTMLCanvasElement | null
  toDataURL: () => string
  getViewport: () => { x: number; y: number; width: number; height: number }
}

// 渲染单个元素
function renderElement(
  ctx: CanvasRenderingContext2D,
  element: WhiteboardElement,
  isSelected: boolean,
  zoom: number
): void {
  ctx.save()
  
  // 应用变换
  ctx.translate(element.x, element.y)
  
  // 设置样式
  ctx.strokeStyle = element.strokeColor || DEFAULT_ELEMENT_STYLES.strokeColor
  ctx.fillStyle = element.backgroundColor || 'transparent'
  ctx.lineWidth = (element.strokeWidth || DEFAULT_ELEMENT_STYLES.strokeWidth) / zoom
  ctx.globalAlpha = (element.opacity || DEFAULT_ELEMENT_STYLES.opacity) / 100

  // 绘制选中框
  if (isSelected) {
    ctx.save()
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1 / zoom
    ctx.setLineDash([5 / zoom, 5 / zoom])
    ctx.strokeRect(-2 / zoom, -2 / zoom, element.width + 4 / zoom, element.height + 4 / zoom)
    
    // 绘制调整手柄
    ctx.setLineDash([])
    ctx.fillStyle = '#3b82f6'
    const handleSize = 8 / zoom
    const handles = [
      { x: -handleSize/2, y: -handleSize/2 }, // 左上
      { x: element.width/2 - handleSize/2, y: -handleSize/2 }, // 上中
      { x: element.width - handleSize/2, y: -handleSize/2 }, // 右上
      { x: -handleSize/2, y: element.height/2 - handleSize/2 }, // 左中
      { x: element.width - handleSize/2, y: element.height/2 - handleSize/2 }, // 右中
      { x: -handleSize/2, y: element.height - handleSize/2 }, // 左下
      { x: element.width/2 - handleSize/2, y: element.height - handleSize/2 }, // 下中
      { x: element.width - handleSize/2, y: element.height - handleSize/2 }, // 右下
    ]
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize)
    })
    ctx.restore()
  }

  // 根据类型绘制
  switch (element.type) {
    case 'rectangle':
      renderRectangle(ctx, element)
      break
    case 'ellipse':
      renderEllipse(ctx, element)
      break
    case 'diamond':
      renderDiamond(ctx, element)
      break
    case 'sticky':
      renderSticky(ctx, element)
      break
    case 'text':
      renderText(ctx, element)
      break
    case 'arrow':
    case 'line':
      renderLine(ctx, element)
      break
  }

  ctx.restore()
}

function renderRectangle(ctx: CanvasRenderingContext2D, element: WhiteboardElement): void {
  const radius = element.roundness || DEFAULT_ELEMENT_STYLES.roundness
  roundRect(ctx, 0, 0, element.width, element.height, radius)
  
  if (element.backgroundColor && element.backgroundColor !== 'transparent') {
    ctx.fill()
  }
  ctx.stroke()
}

function renderEllipse(ctx: CanvasRenderingContext2D, element: WhiteboardElement): void {
  ctx.beginPath()
  ctx.ellipse(
    element.width / 2,
    element.height / 2,
    element.width / 2,
    element.height / 2,
    0,
    0,
    Math.PI * 2
  )
  
  if (element.backgroundColor && element.backgroundColor !== 'transparent') {
    ctx.fill()
  }
  ctx.stroke()
}

function renderDiamond(ctx: CanvasRenderingContext2D, element: WhiteboardElement): void {
  ctx.beginPath()
  ctx.moveTo(element.width / 2, 0)
  ctx.lineTo(element.width, element.height / 2)
  ctx.lineTo(element.width / 2, element.height)
  ctx.lineTo(0, element.height / 2)
  ctx.closePath()
  
  if (element.backgroundColor && element.backgroundColor !== 'transparent') {
    ctx.fill()
  }
  ctx.stroke()
}

function renderSticky(ctx: CanvasRenderingContext2D, element: WhiteboardElement): void {
  // 阴影
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.15)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 4
  ctx.shadowOffsetX = 2
  
  // 背景
  ctx.fillStyle = element.backgroundColor || DEFAULT_ELEMENT_STYLES.backgroundColor
  ctx.fillRect(0, 0, element.width, element.height)
  ctx.restore()
  
  // 文本
  if (element.text) {
    ctx.fillStyle = '#1a1a2e'
    ctx.font = `${element.fontSize || 16}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    ctx.textBaseline = 'top'
    
    const padding = 12
    const maxWidth = element.width - padding * 2
    const lineHeight = (element.fontSize || 16) * 1.4
    const words = element.text.split('')
    let line = ''
    let y = padding
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i]
      const metrics = ctx.measureText(testLine)
      
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, padding, y)
        line = words[i]
        y += lineHeight
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, padding, y)
  }
}

function renderText(ctx: CanvasRenderingContext2D, element: WhiteboardElement): void {
  if (!element.text) return
  
  ctx.fillStyle = element.strokeColor || DEFAULT_ELEMENT_STYLES.strokeColor
  ctx.font = `${element.fontSize || 16}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  ctx.textBaseline = 'top'
  
  const lineHeight = (element.fontSize || 16) * 1.4
  const lines = element.text.split('\n')
  lines.forEach((line, i) => {
    ctx.fillText(line, 0, i * lineHeight)
  })
}

function renderLine(ctx: CanvasRenderingContext2D, element: WhiteboardElement): void {
  if (!element.points || element.points.length < 2) return
  
  ctx.beginPath()
  ctx.moveTo(element.points[0].x, element.points[0].y)
  
  for (let i = 1; i < element.points.length; i++) {
    ctx.lineTo(element.points[i].x, element.points[i].y)
  }
  
  ctx.stroke()
  
  // 箭头头部
  if (element.type === 'arrow' && element.points.length >= 2) {
    const last = element.points[element.points.length - 1]
    const secondLast = element.points[element.points.length - 2]
    const angle = Math.atan2(last.y - secondLast.y, last.x - secondLast.x)
    
    const arrowLength = 15
    const arrowAngle = Math.PI / 6
    
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(
      last.x - arrowLength * Math.cos(angle - arrowAngle),
      last.y - arrowLength * Math.sin(angle - arrowAngle)
    )
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(
      last.x - arrowLength * Math.cos(angle + arrowAngle),
      last.y - arrowLength * Math.sin(angle + arrowAngle)
    )
    ctx.stroke()
  }
}

// 绘制圆角矩形
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

export const Canvas = forwardRef<CanvasRef, CanvasProps>(function Canvas(
  { elements, appState, onCanvasPointerDown, onCanvasPointerMove, onCanvasPointerUp, onCanvasDoubleClick, onWheel, className },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    toDataURL: () => canvasRef.current?.toDataURL() || '',
    getViewport: () => {
      const rect = containerRef.current?.getBoundingClientRect()
      return {
        x: appState.scrollX,
        y: appState.scrollY,
        width: rect?.width || 0,
        height: rect?.height || 0,
      }
    },
  }))

  // 渲染循环
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设置画布尺寸为设备像素比
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
    }
    
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, rect.width, rect.height)

    // 保存上下文
    ctx.save()

    // 应用视口变换（平移 + 缩放）
    ctx.translate(appState.scrollX + rect.width / 2, appState.scrollY + rect.height / 2)
    ctx.scale(appState.zoom, appState.zoom)
    ctx.translate(-rect.width / 2, -rect.height / 2)

    // 绘制网格背景
    renderGrid(ctx, rect.width, rect.height, appState.scrollX, appState.scrollY, appState.zoom)

    // 绘制所有元素
    elements.forEach(element => {
      const isSelected = appState.selectedElementIds.has(element.id)
      renderElement(ctx, element, isSelected, appState.zoom)
    })

    // 绘制选择框（如果有）
    if (appState.selectionElement) {
      renderSelectionBox(ctx, appState.selectionElement)
    }

    ctx.restore()
  }, [elements, appState])

  // 绘制网格
  const renderGrid = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scrollX: number,
    scrollY: number,
    zoom: number
  ) => {
    const gridSize = 20 * zoom
    const offsetX = (scrollX + width / 2) % gridSize
    const offsetY = (scrollY + height / 2) % gridSize

    ctx.save()
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 0.5 / zoom

    // 垂直线
    for (let x = offsetX - width / 2; x < width * 1.5; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, -height)
      ctx.lineTo(x, height * 2)
      ctx.stroke()
    }

    // 水平线
    for (let y = offsetY - height / 2; y < height * 1.5; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(-width, y)
      ctx.lineTo(width * 2, y)
      ctx.stroke()
    }

    ctx.restore()
  }

  // 绘制选择框
  const renderSelectionBox = (ctx: CanvasRenderingContext2D, element: WhiteboardElement) => {
    ctx.save()
    ctx.translate(element.x, element.y)
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1 / appState.zoom
    ctx.setLineDash([5 / appState.zoom, 5 / appState.zoom])
    ctx.strokeRect(0, 0, element.width, element.height)
    ctx.restore()
  }

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden bg-white", className)}>
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair touch-none"
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onDoubleClick={onCanvasDoubleClick}
        onWheel={onWheel}
        style={{ touchAction: 'none' }}
      />
    </div>
  )
})
