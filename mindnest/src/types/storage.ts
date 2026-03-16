// 存储格式类型
export type StorageFormat = 'markdown' | 'mindnest' | 'hybrid'

// 文档存储元数据
export interface DocumentMetadata {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  tags: string[]
  type: 'document' | 'spreadsheet' | 'whiteboard' | 'note'
  format: StorageFormat
  version: number
}

// MindNest 原生格式 (.mn)
export interface MindNestDocument {
  // 头部元数据 (YAML frontmatter 风格)
  metadata: DocumentMetadata
  
  // 块结构 (用于文档类型)
  blocks?: Array<{
    id: string
    type: string
    content: string
    meta?: Record<string, any>
  }>
  
  // 原始内容 (用于其他类型)
  content?: string
  data?: any
}

// 存储配置
export interface StorageConfig {
  basePath: string          // 基础存储路径
  defaultFormat: StorageFormat
  autoSave: boolean
  autoSaveInterval: number  // 毫秒
  backupEnabled: boolean
  backupInterval: number    // 毫秒
}

// 文件系统项
export interface FileSystemItem {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  format?: StorageFormat
  metadata?: DocumentMetadata
  children?: FileSystemItem[]
  isExpanded?: boolean
}

// 导出选项
export interface ExportOptions {
  format: 'markdown' | 'html' | 'pdf' | 'json'
  includeMetadata: boolean
  includeAttachments: boolean
}

// 导入结果
export interface ImportResult {
  success: boolean
  imported: number
  failed: number
  errors: string[]
}
