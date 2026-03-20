/**
 * 常量模块导出
 * 
 * @example
 * import { APP_CONFIG, DRAG_CONFIG, DOCUMENT_TYPE_CONFIG } from '@/constants'
 * // 类型请从 @/types 导入
 * import type { DocumentType } from '@/types'
 */

// 文档类型（仅导出值，不导出类型，类型统一从 @/types 导入）
export {
  DOCUMENT_TYPE_TO_CONTENT_TYPE,
  CONTENT_TYPE_TO_DOCUMENT_TYPE,
  DOCUMENT_TYPE_CONFIG,
  DOCUMENT_TYPE_NAMES,
  DOCUMENT_TYPE_ICONS,
  DOCUMENT_TYPE_LUCIDE_ICONS,
  getDocumentTypeConfig,
  getDocumentTypeFromContentType,
  getContentTypeFromDocumentType,
} from './documentTypes'
// DocumentType, ContentType, DocumentTypeConfig 类型请从 @/types 导入

// 应用配置
export {
  APP_CONFIG,
  DRAG_CONFIG,
  FOLDER_DRAG_CONFIG,
  ANIMATION_CONFIG,
  SIDEBAR_CONFIG,
  THEME_CONFIG,
  DOCUMENT_LIST_CONFIG,
  KB_CONFIG,
  SEARCH_CONFIG,
  KEYBOARD_SHORTCUTS,
  Z_INDEX,
  STORAGE_KEYS,
} from './config'
