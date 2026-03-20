/**
 * React DnD 拖拽类型定义
 */

export enum DragItemType {
  DOCUMENT = 'document',
  FOLDER = 'folder',
}

export interface DocumentDragItem {
  type: DragItemType.DOCUMENT
  id: string
  title: string
  docType: string
  folderId: string
  position?: number
}

export interface FolderDragItem {
  type: DragItemType.FOLDER
  id: string
  name: string
  parentId?: string
  position?: number
}

export type DragItem = DocumentDragItem | FolderDragItem

export interface DropResult {
  targetId: string
  targetType: DragItemType
  position: 'before' | 'after' | 'inside'
}

export interface DragCollectedProps {
  isDragging: boolean
}

export interface DropCollectedProps {
  isOver: boolean
  canDrop: boolean
  dropPosition: 'before' | 'after' | 'inside' | null
}
