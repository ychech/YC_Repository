// 语雀四种内容形态
export type DocumentType = 'document' | 'spreadsheet' | 'whiteboard' | 'note'

export interface Document {
  id: string
  type: DocumentType
  title: string
  content?: string        // 文档、小记的 Markdown/JSON 内容
  data?: any             // 数据表的行数据、画板的图形数据
  kbId: string           // 所属知识库 ID
  parentId?: string      // 所属文件夹/分组 ID
  isPinned?: boolean
  isFavorite?: boolean
  createdAt: Date
  updatedAt: Date
  children?: Document[]
  
  // 类型特定的元数据
  meta?: {
    // 文档
    wordCount?: number
    readingTime?: number
    
    // 数据表
    rowCount?: number
    viewCount?: number
    
    // 画板
    nodeCount?: number
    
    // 小记
    tags?: string[]
    mood?: string
  }
}

// 文档块类型（卡片式插入）
export type DocumentBlock = 
  | { type: 'paragraph'; content: string }
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; content: string }
  | { type: 'code'; language: string; content: string }
  | { type: 'math'; content: string }                    // LaTeX
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'mindmap'; data: MindMapNode }              // 脑图
  | { type: 'plantuml'; content: string }               // 流程图
  | { type: 'image'; src: string; alt?: string }
  | { type: 'video'; src: string }
  | { type: 'pdf'; src: string; pageCount?: number }
  | { type: 'office'; src: string; fileType: 'word' | 'excel' | 'ppt' }
  | { type: 'embed'; url: string; title?: string }      // 嵌入第三方
  | { type: 'divider' }
  | { type: 'callout'; content: string; style?: 'info' | 'warning' | 'success' | 'error' }

export interface MindMapNode {
  text: string
  children?: MindMapNode[]
}

// 数据表
export interface SpreadsheetData {
  columns: SpreadsheetColumn[]
  rows: SpreadsheetRow[]
  views: SpreadsheetView[]
}

export interface SpreadsheetColumn {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'select' | 'multiSelect' | 'checkbox' | 'link' | 'formula'
  options?: string[]
  formula?: string
  width?: number
}

export interface SpreadsheetRow {
  id: string
  [columnId: string]: any
}

export type SpreadsheetViewType = 'table' | 'board' | 'gallery' | 'form' | 'calendar' | 'gantt'

export interface SpreadsheetView {
  id: string
  name: string
  type: SpreadsheetViewType
  filters?: ViewFilter[]
  sorts?: ViewSort[]
  groupBy?: string
}

export interface ViewFilter {
  columnId: string
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'isEmpty'
  value?: any
}

export interface ViewSort {
  columnId: string
  direction: 'asc' | 'desc'
}

// 画板
export interface WhiteboardData {
  nodes: WhiteboardNode[]
  edges: WhiteboardEdge[]
  viewport: { x: number; y: number; zoom: number }
}

export type WhiteboardNodeType = 
  | 'text' | 'rectangle' | 'ellipse' | 'diamond'
  | 'sticky' | 'image' | 'code'
  | 'mindmap-root' | 'mindmap-node'

export interface WhiteboardNode {
  id: string
  type: WhiteboardNodeType
  x: number
  y: number
  width: number
  height: number
  content?: string
  style?: NodeStyle
  parentId?: string
}

export interface NodeStyle {
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  fontSize?: number
  color?: string
}

export interface WhiteboardEdge {
  id: string
  source: string
  target: string
  type?: 'straight' | 'curved' | 'orthogonal'
  label?: string
}

// 小记
export interface NoteData {
  content: string
  images?: string[]
  tags?: string[]
  mood?: 'happy' | 'calm' | 'tired' | 'excited' | 'sad'
  weather?: 'sunny' | 'cloudy' | 'rainy' | 'snowy'
  location?: string
}
