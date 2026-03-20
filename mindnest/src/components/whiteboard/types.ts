/**
 * 画板类型定义
 * 参考 Excalidraw 设计，支持无限画布、多种形状、连接线
 */

export type WhiteboardElementType = 
  | 'selection' 
  | 'rectangle' 
  | 'ellipse' 
  | 'diamond' 
  | 'arrow' 
  | 'line' 
  | 'text' 
  | 'sticky'
  | 'image'

export interface Point {
  x: number
  y: number
}

export interface WhiteboardElement {
  id: string
  type: Exclude<WhiteboardElementType, 'selection'>
  x: number
  y: number
  width: number
  height: number
  
  // 样式
  backgroundColor?: string
  strokeColor?: string
  strokeWidth?: number
  opacity?: number
  
  // 形状特有属性
  text?: string           // 文本内容
  fontSize?: number       // 字体大小
  roundness?: number      // 圆角程度
  
  // 连接线
  startBinding?: { elementId: string; focus: number; gap: number }
  endBinding?: { elementId: string; focus: number; gap: number }
  points?: Point[]        // 线条路径点
  
  // 选中状态
  isSelected?: boolean
  groupIds?: string[]
  
  // 版本控制
  version: number
  versionNonce: number
  updated: number
}

export interface WhiteboardAppState {
  viewBackgroundColor: string
  zoom: number
  scrollX: number
  scrollY: number
  cursorX: number
  cursorY: number
  activeTool: WhiteboardElementType
  selectionElement: WhiteboardElement | null
  selectedElementIds: Set<string>
  isResizing: boolean
  isDragging: boolean
  isWriting: boolean
  contextMenu: { x: number; y: number } | null
}

export interface WhiteboardData {
  elements: WhiteboardElement[]
  appState: Partial<WhiteboardAppState>
  files?: Record<string, { dataURL: string; mimeType: string }>
}

// 工具定义
export interface Tool {
  type: WhiteboardElementType
  icon: React.ComponentType<{ className?: string }>
  label: string
  shortcut?: string
}

// 默认样式
export const DEFAULT_ELEMENT_STYLES = {
  backgroundColor: '#fff9c4',  // 便签默认黄色
  strokeColor: '#1a1a2e',       // 深色边框
  strokeWidth: 2,
  opacity: 100,
  fontSize: 16,
  roundness: 8,
}

// 颜色预设
export const COLORS = [
  { name: '黑色', value: '#1a1a2e' },
  { name: '红色', value: '#e53935' },
  { name: '橙色', value: '#fb8c00' },
  { name: '黄色', value: '#fdd835' },
  { name: '绿色', value: '#43a047' },
  { name: '蓝色', value: '#1e88e5' },
  { name: '紫色', value: '#8e24aa' },
  { name: '灰色', value: '#757575' },
]

// 背景色预设（便签）
export const BACKGROUND_COLORS = [
  { name: '白色', value: '#ffffff' },
  { name: '浅黄', value: '#fff9c4' },
  { name: '浅绿', value: '#dcedc8' },
  { name: '浅蓝', value: '#b3e5fc' },
  { name: '浅粉', value: '#f8bbd9' },
  { name: '浅橙', value: '#ffe0b2' },
  { name: '浅紫', value: '#e1bee7' },
  { name: '浅灰', value: '#f5f5f5' },
]

// 生成唯一ID
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`
}

// 创建新元素
export function createElement(
  type: WhiteboardElement['type'],
  x: number,
  y: number,
  overrides: Partial<WhiteboardElement> = {}
): WhiteboardElement {
  const now = Date.now()
  return {
    id: generateId(),
    type,
    x,
    y,
    width: type === 'text' ? 100 : 100,
    height: type === 'text' ? 40 : 100,
    backgroundColor: type === 'sticky' ? DEFAULT_ELEMENT_STYLES.backgroundColor : 'transparent',
    strokeColor: DEFAULT_ELEMENT_STYLES.strokeColor,
    strokeWidth: DEFAULT_ELEMENT_STYLES.strokeWidth,
    opacity: DEFAULT_ELEMENT_STYLES.opacity,
    fontSize: DEFAULT_ELEMENT_STYLES.fontSize,
    text: type === 'text' || type === 'sticky' ? '' : undefined,
    version: 1,
    versionNonce: Math.random(),
    updated: now,
    ...overrides,
  }
}
