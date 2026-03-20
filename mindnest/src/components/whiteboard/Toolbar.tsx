/**
 * 画板工具栏
 */

import React from 'react'
import { cn } from '../../utils/cn'
import {
  MousePointer2,
  Square,
  Circle,
  Diamond,
  ArrowRight,
  Minus,
  Type,
  StickyNote,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Trash2,
  Download,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { WhiteboardElementType } from './types'
import { COLORS, BACKGROUND_COLORS } from './types'

interface ToolbarProps {
  activeTool: WhiteboardElementType
  onToolChange: (tool: WhiteboardElementType) => void
  strokeColor: string
  onStrokeColorChange: (color: string) => void
  backgroundColor: string
  onBackgroundColorChange: (color: string) => void
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onDelete: () => void
  hasSelection: boolean
}

const tools: { type: WhiteboardElementType; icon: React.ElementType; label: string; shortcut?: string }[] = [
  { type: 'selection', icon: MousePointer2, label: '选择 (V)', shortcut: 'V' },
  { type: 'rectangle', icon: Square, label: '矩形 (R)', shortcut: 'R' },
  { type: 'ellipse', icon: Circle, label: '圆形 (O)', shortcut: 'O' },
  { type: 'diamond', icon: Diamond, label: '菱形 (D)', shortcut: 'D' },
  { type: 'arrow', icon: ArrowRight, label: '箭头 (A)', shortcut: 'A' },
  { type: 'line', icon: Minus, label: '线条 (L)', shortcut: 'L' },
  { type: 'text', icon: Type, label: '文本 (T)', shortcut: 'T' },
  { type: 'sticky', icon: StickyNote, label: '便签 (S)', shortcut: 'S' },
]

export function Toolbar({
  activeTool,
  onToolChange,
  strokeColor,
  onStrokeColorChange,
  backgroundColor,
  onBackgroundColorChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDelete,
  hasSelection,
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-2 p-2 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* 工具 */}
      <div className="flex flex-col gap-1">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <button
              key={tool.type}
              onClick={() => onToolChange(tool.type)}
              title={tool.label}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-lg transition-all",
                activeTool === tool.type
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <Icon className="w-5 h-5" />
            </button>
          )
        })}
      </div>

      <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-1" />

      {/* 颜色 */}
      <div className="flex flex-col gap-1">
        <div className="text-[10px] text-gray-500 dark:text-gray-400 px-1">线条</div>
        <div className="grid grid-cols-2 gap-1">
          {COLORS.slice(0, 6).map((color) => (
            <button
              key={color.value}
              onClick={() => onStrokeColorChange(color.value)}
              className={cn(
                "w-4 h-4 rounded-full border-2 transition-all",
                strokeColor === color.value
                  ? "border-gray-400 dark:border-gray-500 scale-110"
                  : "border-transparent hover:scale-110"
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-1" />

      {/* 背景色（仅便签） */}
      <div className="flex flex-col gap-1">
        <div className="text-[10px] text-gray-500 dark:text-gray-400 px-1">填充</div>
        <div className="grid grid-cols-2 gap-1">
          {BACKGROUND_COLORS.slice(0, 6).map((color) => (
            <button
              key={color.value}
              onClick={() => onBackgroundColorChange(color.value)}
              className={cn(
                "w-4 h-4 rounded-full border-2 transition-all",
                backgroundColor === color.value
                  ? "border-gray-400 dark:border-gray-500 scale-110"
                  : "border-transparent hover:scale-110"
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-1" />

      {/* 操作 */}
      <div className="flex flex-col gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-lg transition-all",
            canUndo
              ? "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
          )}
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 className="w-5 h-5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-lg transition-all",
            canRedo
              ? "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
          )}
          title="重做 (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-5 h-5" />
        </button>
        <button
          onClick={onDelete}
          disabled={!hasSelection}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-lg transition-all",
            hasSelection
              ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
          )}
          title="删除 (Delete)"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1" />

      {/* 缩放 */}
      <div className="flex flex-col gap-1">
        <button
          onClick={onZoomIn}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="放大"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={onResetZoom}
          className="text-xs font-medium text-gray-600 dark:text-gray-400 py-1"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={onZoomOut}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="缩小"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
