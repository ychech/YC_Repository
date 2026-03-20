/**
 * 文档类型常量定义
 * 
 * 集中管理所有文档类型相关的配置，避免在多个文件中重复定义
 * 
 * @author AI3 (基于 AI5 的代码审查建议)
 * @see docs/AI5_CODE_QUALITY_REVIEW.md
 */

import { FileText, Table2, LayoutGrid, StickyNote, type LucideIcon } from 'lucide-react'
import type { DocumentType } from '../types/document'

// DocumentType 类型从 types/document 重新导出
export type { DocumentType } from '../types/document'

/** 后端内容类型映射 */
export type ContentType = 'markdown' | 'database' | 'canvas'

/** 前端类型到后端类型的映射 */
export const DOCUMENT_TYPE_TO_CONTENT_TYPE: Record<DocumentType, ContentType> = {
  document: 'markdown',
  spreadsheet: 'database',
  whiteboard: 'canvas',
  note: 'markdown',
}

/** 后端类型到前端类型的映射 */
export const CONTENT_TYPE_TO_DOCUMENT_TYPE: Record<ContentType, DocumentType> = {
  markdown: 'document',
  database: 'spreadsheet',
  canvas: 'whiteboard',
}

/** 文档类型配置 */
export interface DocumentTypeConfig {
  /** 类型标识 */
  type: DocumentType
  /** 后端对应类型 */
  contentType: ContentType
  /** 显示名称 */
  name: string
  /** 英文名称 */
  nameEn: string
  /** Emoji 图标 */
  emoji: string
  /** Lucide 图标组件 */
  icon: LucideIcon
  /** 文字颜色类名（黑灰主题） */
  textColor: string
  /** 背景颜色类名 */
  bgColor: string
  /** 悬停背景色 */
  hoverBgColor: string
  /** 边框颜色 */
  borderColor: string
  /** 文件扩展名 */
  extension: string
  /** 是否支持 Markdown */
  supportsMarkdown: boolean
  /** 描述 */
  description: string
}

/** 文档类型详细配置映射 */
export const DOCUMENT_TYPE_CONFIG: Record<DocumentType, DocumentTypeConfig> = {
  document: {
    type: 'document',
    contentType: 'markdown',
    name: '文档',
    nameEn: 'Document',
    emoji: '📄',
    icon: FileText,
    textColor: 'text-gray-300',
    bgColor: 'bg-gray-800',
    hoverBgColor: 'hover:bg-gray-700',
    borderColor: 'border-gray-700',
    extension: '.md',
    supportsMarkdown: true,
    description: 'Markdown 文档，支持富文本编辑',
  },
  spreadsheet: {
    type: 'spreadsheet',
    contentType: 'database',
    name: '表格',
    nameEn: 'Spreadsheet',
    emoji: '📊',
    icon: Table2,
    textColor: 'text-gray-300',
    bgColor: 'bg-gray-800',
    hoverBgColor: 'hover:bg-gray-700',
    borderColor: 'border-gray-700',
    extension: '.db',
    supportsMarkdown: false,
    description: '数据表格，支持公式和筛选',
  },
  whiteboard: {
    type: 'whiteboard',
    contentType: 'canvas',
    name: '画板',
    nameEn: 'Whiteboard',
    emoji: '🎨',
    icon: LayoutGrid,
    textColor: 'text-gray-300',
    bgColor: 'bg-gray-800',
    hoverBgColor: 'hover:bg-gray-700',
    borderColor: 'border-gray-700',
    extension: '.canvas',
    supportsMarkdown: false,
    description: '无限画布，自由创作',
  },
  note: {
    type: 'note',
    contentType: 'markdown',
    name: '便签',
    nameEn: 'Note',
    emoji: '📝',
    icon: StickyNote,
    textColor: 'text-gray-300',
    bgColor: 'bg-gray-800',
    hoverBgColor: 'hover:bg-gray-700',
    borderColor: 'border-gray-700',
    extension: '.md',
    supportsMarkdown: true,
    description: '快速记录，简洁高效',
  },
}

/** 类型名称映射（兼容旧代码） */
export const DOCUMENT_TYPE_NAMES: Record<DocumentType, string> = {
  document: '文档',
  spreadsheet: '表格',
  whiteboard: '画板',
  note: '便签',
}

/** 类型图标映射（Emoji 版本，兼容旧代码） */
export const DOCUMENT_TYPE_ICONS: Record<DocumentType, string> = {
  document: '📄',
  spreadsheet: '📊',
  whiteboard: '🎨',
  note: '📝',
}

/** Lucide 图标映射（兼容旧代码） */
export const DOCUMENT_TYPE_LUCIDE_ICONS: Record<DocumentType, LucideIcon> = {
  document: FileText,
  spreadsheet: Table2,
  whiteboard: LayoutGrid,
  note: StickyNote,
}

/** 获取文档类型配置 */
export function getDocumentTypeConfig(type: DocumentType): DocumentTypeConfig {
  return DOCUMENT_TYPE_CONFIG[type]
}

/** 根据后端类型获取前端类型 */
export function getDocumentTypeFromContentType(contentType: ContentType): DocumentType {
  return CONTENT_TYPE_TO_DOCUMENT_TYPE[contentType]
}

/** 根据前端类型获取后端类型 */
export function getContentTypeFromDocumentType(type: DocumentType): ContentType {
  return DOCUMENT_TYPE_TO_CONTENT_TYPE[type]
}
