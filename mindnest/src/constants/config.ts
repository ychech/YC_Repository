/**
 * 应用全局配置常量
 * 
 * 集中管理所有硬编码值，避免魔法数字散落在代码中
 * 
 * @author AI3 (基于 AI5 的代码审查建议)
 * @see docs/AI5_CODE_QUALITY_REVIEW.md
 */

/** 应用基础配置 */
export const APP_CONFIG = {
  /** 应用名称 */
  NAME: 'MindNest',
  /** 默认知识库 ID */
  DEFAULT_KB_ID: 'default_kb',
  /** 默认工作区 ID */
  DEFAULT_WORKSPACE_ID: 'default_workspace',
  /** 最大最近文件数 */
  MAX_RECENT_FILES: 20,
  /** 自动保存延迟（毫秒） */
  AUTO_SAVE_DELAY: 2000,
  /** Toast 提示持续时间（毫秒） */
  TOAST_DURATION: 2000,
  /** 确认提示持续时间（毫秒） */
  CONFIRM_DURATION: 1500,
} as const

/** 拖拽排序配置 */
export const DRAG_CONFIG = {
  /** 位置增量基数（用于计算排序位置） */
  POSITION_INCREMENT: 1000,
  /** 最小位置值 */
  MIN_POSITION: -1000000,
  /** 最大位置值 */
  MAX_POSITION: 1000000,
  /** 拖拽指示线高度（像素） */
  DROP_INDICATOR_HEIGHT: 2,
  /** 拖拽指示线颜色类名 */
  DROP_INDICATOR_COLOR: 'bg-white',
  /** 拖拽指示线发光效果 */
  DROP_INDICATOR_SHADOW: 'shadow-[0_0_8px_rgba(255,255,255,0.8)]',
  /** 放置区域高亮背景色 */
  DROP_HIGHLIGHT_BG: 'bg-white/10',
  /** 文件夹内部放置高亮 */
  FOLDER_DROP_HIGHLIGHT: 'bg-gray-800 ring-1 ring-gray-600',
  /** 拖拽时透明度 */
  DRAGGING_OPACITY: 0.5,
  /** 自动滚动触发边界（像素） */
  AUTO_SCROLL_THRESHOLD: 50,
  /** 自动滚动速度（像素/帧） */
  AUTO_SCROLL_SPEED: 8,
  /** 文件夹上方区域比例（触发 before 放置） */
  FOLDER_BEFORE_THRESHOLD: 0.25,
  /** 文件夹下方区域比例（触发 after 放置） */
  FOLDER_AFTER_THRESHOLD: 0.75,
} as const

/** 文件夹拖拽配置 */
export const FOLDER_DRAG_CONFIG = {
  /** 缩进基础像素 */
  INDENT_BASE: 8,
  /** 每级缩进增量 */
  INDENT_PER_LEVEL: 12,
  /** 展开动画时长（毫秒） */
  EXPAND_ANIMATION_DURATION: 200,
  /** 自动展开延迟（毫秒） */
  AUTO_EXPAND_DELAY: 800,
} as const

/** UI 动画配置 */
export const ANIMATION_CONFIG = {
  /** 快速过渡 */
  FAST: 150,
  /** 正常过渡 */
  NORMAL: 200,
  /** 慢速过渡 */
  SLOW: 300,
  /** 缓动函数 */
  EASING: 'ease-out',
  /** 弹窗动画 */
  MODAL_DURATION: 200,
  /** 菜单动画 */
  MENU_DURATION: 150,
  /** Toast 动画 */
  TOAST_DURATION: 200,
} as const

/** 侧边栏配置 */
export const SIDEBAR_CONFIG = {
  /** 默认宽度（像素） */
  DEFAULT_WIDTH: 256,
  /** 折叠后宽度（像素） */
  COLLAPSED_WIDTH: 48,
  /** 最小宽度（像素） */
  MIN_WIDTH: 200,
  /** 最大宽度（像素） */
  MAX_WIDTH: 400,
  /** 文件夹图标大小 */
  FOLDER_ICON_SIZE: 16,
  /** 文档图标大小 */
  DOCUMENT_ICON_SIZE: 14,
  /** 拖拽手柄大小 */
  DRAG_HANDLE_SIZE: 12,
} as const

/** 颜色主题配置（黑灰主题） */
export const THEME_CONFIG = {
  /** 主背景色 */
  BG_PRIMARY: '#000000',
  /** 次背景色 */
  BG_SECONDARY: '#111111',
  /** 卡片背景 */
  BG_CARD: '#1a1a1a',
  /** 悬停背景 */
  BG_HOVER: '#222222',
  /** 主文字色 */
  TEXT_PRIMARY: '#ffffff',
  /** 次文字色 */
  TEXT_SECONDARY: '#cccccc',
  /** 三级文字 */
  TEXT_TERTIARY: '#888888',
  /** 禁用文字 */
  TEXT_DISABLED: '#666666',
  /** 边框色 */
  BORDER: '#333333',
  /** 边框亮色 */
  BORDER_LIGHT: '#444444',
  /** 强调色（白色，用于指示线等） */
  ACCENT: '#ffffff',
  /** 错误色 */
  ERROR: '#ef4444',
  /** 成功色 */
  SUCCESS: '#22c55e',
  /** 警告色 */
  WARNING: '#f59e0b',
} as const

/** 文档列表配置 */
export const DOCUMENT_LIST_CONFIG = {
  /** 默认每页数量 */
  PAGE_SIZE: 50,
  /** 虚拟滚动项目高度 */
  ITEM_HEIGHT: 40,
  /** 虚拟滚动缓冲区 */
  OVERSCAN: 5,
  /** 空文件夹提示文字 */
  EMPTY_FOLDER_TEXT: '空文件夹',
  /** 拖拽到空文件夹提示 */
  EMPTY_FOLDER_DROP_TEXT: '拖放到此处',
  /** 未分组标题 */
  UNGROUPED_TITLE: '未分组',
} as const

/** 知识库配置 */
export const KB_CONFIG = {
  /** 最大知识库数量 */
  MAX_KNOWLEDGE_BASES: 10,
  /** 默认图标 */
  DEFAULT_ICON: '📚',
  /** 默认名称 */
  DEFAULT_NAME: '默认知识库',
  /** 文件夹最大深度 */
  MAX_FOLDER_DEPTH: 5,
} as const

/** 搜索配置 */
export const SEARCH_CONFIG = {
  /** 最小搜索长度 */
  MIN_QUERY_LENGTH: 2,
  /** 最大搜索结果 */
  MAX_RESULTS: 50,
  /** 搜索防抖延迟（毫秒） */
  DEBOUNCE_DELAY: 300,
  /** 高亮标签类名 */
  HIGHLIGHT_CLASS: 'bg-gray-700 text-white',
} as const

/** 键盘快捷键 */
export const KEYBOARD_SHORTCUTS = {
  /** 新建文档 */
  NEW_DOCUMENT: 'Cmd+N',
  /** 搜索 */
  SEARCH: 'Cmd+K',
  /** 保存 */
  SAVE: 'Cmd+S',
  /** 关闭当前文档 */
  CLOSE: 'Cmd+W',
  /** 切换侧边栏 */
  TOGGLE_SIDEBAR: 'Cmd+B',
  /** 快速命令 */
  COMMAND_PALETTE: 'Cmd+P',
  /** 聚焦编辑器 */
  FOCUS_EDITOR: 'Cmd+E',
  /** 创建链接 */
  CREATE_LINK: '[[',
} as const

/** Z-Index 层级 */
export const Z_INDEX = {
  /** 背景层 */
  BACKGROUND: 0,
  /** 内容层 */
  CONTENT: 10,
  /** 浮动元素 */
  FLOATING: 20,
  /** 遮罩层 */
  OVERLAY: 30,
  /** 弹窗/菜单 */
  MODAL: 40,
  /** 拖拽预览 */
  DRAG_PREVIEW: 50,
  /** 通知 */
  TOAST: 100,
  /** 调试 */
  DEBUG: 9999,
} as const

/** 本地存储键名 */
export const STORAGE_KEYS = {
  /** 文档存储 */
  DOCUMENTS: 'document-storage',
  /** 知识库存储 */
  KNOWLEDGE_BASES: 'kb-storage',
  /** 设置存储 */
  SETTINGS: 'settings-storage',
  /** 最近文档 */
  RECENT_DOCUMENTS: 'recent-docs',
  /** 用户偏好 */
  PREFERENCES: 'user-preferences',
  /** 主题设置 */
  THEME: 'theme-settings',
} as const
