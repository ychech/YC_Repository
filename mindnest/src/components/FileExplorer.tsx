import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  FolderPlus,
  MoreHorizontal,
  Search,
  RefreshCw,
  Settings,
  FileJson,
  FileCode,
  FileImage,
  Trash2,
  Edit3,
  Copy,
  Scissors,
  Download
} from 'lucide-react'
import { cn } from '../utils/cn'
import type { FileSystemItem, StorageFormat } from '../types/storage'
import type { DocumentType } from '../stores/document'

type ViewMode = 'list' | 'grid'
type SortBy = 'name' | 'date' | 'type'

interface FileExplorerProps {
  items: FileSystemItem[]
  currentPath: string
  onNavigate: (path: string) => void
  onSelect: (item: FileSystemItem) => void
  onCreateFile: (type: DocumentType, format: StorageFormat) => void
  onCreateFolder: () => void
  onDelete: (item: FileSystemItem) => void
  onRename: (item: FileSystemItem, newName: string) => void
  selectedItems: string[]
  onSelectItems: (ids: string[]) => void
}

// 文件图标映射
const fileIcons: Record<string, any> = {
  'md': FileText,
  'mn': FileJson,
  'json': FileCode,
  'png': FileImage,
  'jpg': FileImage,
  'jpeg': FileImage,
  'gif': FileImage,
  'svg': FileImage,
  'folder': Folder
}

// 获取文件图标
function getFileIcon(item: FileSystemItem) {
  if (item.type === 'folder') return Folder
  const ext = item.name.split('.').pop()?.toLowerCase()
  return fileIcons[ext || ''] || FileText
}

// 格式化文件大小
function formatSize(bytes?: number): string {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

// 树形目录项
function TreeItem({
  item,
  level = 0,
  onToggle,
  onSelect,
  selectedId
}: {
  item: FileSystemItem
  level?: number
  onToggle: (id: string) => void
  onSelect: (item: FileSystemItem) => void
  selectedId: string | null
}) {
  const Icon = getFileIcon(item)
  const isSelected = selectedId === item.id
  const paddingLeft = level * 12 + 8

  return (
    <div>
      <button
        onClick={() => item.type === 'folder' ? onToggle(item.id) : onSelect(item)}
        className={cn(
          "w-full flex items-center gap-2 py-1.5 px-2 rounded-lg text-sm transition-colors",
          isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
        )}
        style={{ paddingLeft }}
      >
        {item.type === 'folder' && (
          item.isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
        )}
        <Icon className={cn(
          "w-4 h-4 shrink-0",
          item.type === 'folder' && "text-gray-500",
          item.name.endsWith('.md') && "text-gray-500",
          item.name.endsWith('.mn') && "text-purple-500"
        )} />
        <span className="truncate flex-1 text-left">{item.name}</span>
      </button>
      
      <AnimatePresence>
        {item.type === 'folder' && item.isExpanded && item.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {item.children.map(child => (
              <TreeItem
                key={child.id}
                item={child}
                level={level + 1}
                onToggle={onToggle}
                onSelect={onSelect}
                selectedId={selectedId}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// 网格视图项
function GridItem({
  item,
  isSelected,
  onClick,
  onDoubleClick,
  onContextMenu
}: {
  item: FileSystemItem
  isSelected: boolean
  onClick: () => void
  onDoubleClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  const Icon = getFileIcon(item)

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={cn(
        "flex flex-col items-center p-4 rounded-xl border transition-all",
        isSelected
          ? "bg-accent border-primary/50 shadow-sm"
          : "bg-card border-border hover:border-primary/30 hover:shadow-sm"
      )}
    >
      <Icon className={cn(
        "w-12 h-12 mb-3",
        item.type === 'folder' && "text-gray-500",
        item.name.endsWith('.md') && "text-gray-500",
        item.name.endsWith('.mn') && "text-purple-500"
      )} />
      <span className="text-sm font-medium truncate w-full text-center">{item.name}</span>
      <span className="text-xs text-muted-foreground mt-1">
        {item.type === 'folder' 
          ? `${item.children?.length || 0} 项` 
          : item.metadata?.updatedAt 
            ? new Date(item.metadata.updatedAt).toLocaleDateString()
            : ''
        }
      </span>
    </motion.button>
  )
}

// 列表视图项
function ListItem({
  item,
  isSelected,
  onClick,
  onDoubleClick,
  onContextMenu
}: {
  item: FileSystemItem
  isSelected: boolean
  onClick: () => void
  onDoubleClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}) {
  const Icon = getFileIcon(item)

  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className={cn(
        "w-5 h-5 shrink-0",
        item.type === 'folder' && "text-gray-500",
        item.name.endsWith('.md') && "text-gray-500",
        item.name.endsWith('.mn') && "text-purple-500"
      )} />
      <span className="flex-1 text-left truncate font-medium">{item.name}</span>
      <span className="text-xs text-muted-foreground w-24 text-right">
        {item.type === 'folder' 
          ? `${item.children?.length || 0} 项`
          : item.metadata?.updatedAt 
            ? new Date(item.metadata.updatedAt).toLocaleDateString()
            : ''
        }
      </span>
    </button>
  )
}

// 右键菜单
function ContextMenu({
  x,
  y,
  item,
  onClose,
  onRename,
  onDelete,
  onCopy,
  onCut,
  onDownload
}: {
  x: number
  y: number
  item: FileSystemItem
  onClose: () => void
  onRename: () => void
  onDelete: () => void
  onCopy: () => void
  onCut: () => void
  onDownload: () => void
}) {
  const items = [
    { icon: Edit3, label: '重命名', action: onRename },
    { icon: Copy, label: '复制', action: onCopy },
    { icon: Scissors, label: '剪切', action: onCut },
    { icon: Download, label: '下载', action: onDownload, hide: item.type === 'folder' },
    { separator: true },
    { icon: Trash2, label: '删除', action: onDelete, danger: true }
  ]

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ left: x, top: y }}
        className="fixed z-50 w-48 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden py-1"
      >
        {items.filter((i: any) => !i.hide).map((menuItem: any, index) => (
          menuItem.separator ? (
            <div key={index} className="my-1 h-px bg-border" />
          ) : (
            <button
              key={index}
              onClick={() => { menuItem.action(); onClose(); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                menuItem.danger 
                  ? "hover:bg-destructive/10 text-destructive" 
                  : "hover:bg-accent text-foreground"
              )}
            >
              <menuItem.icon className="w-4 h-4" />
              {menuItem.label}
            </button>
          )
        ))}
      </motion.div>
    </>
  )
}

// 主文件浏览器组件
export function FileExplorer({
  items,
  currentPath,
  onNavigate,
  onSelect,
  onCreateFile,
  onCreateFolder,
  onDelete,
  onRename,
  selectedItems,
  onSelectItems
}: FileExplorerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileSystemItem } | null>(null)
  const [showNewMenu, setShowNewMenu] = useState(false)

  // 切换文件夹展开
  const toggleFolder = (id: string) => {
    const newSet = new Set(expandedFolders)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedFolders(newSet)
  }

  // 过滤和排序项目
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    // 文件夹排在前面
    if (a.type === 'folder' && b.type !== 'folder') return -1
    if (a.type !== 'folder' && b.type === 'folder') return 1
    
    switch (sortBy) {
      case 'date':
        return new Date(b.metadata?.updatedAt || 0).getTime() - new Date(a.metadata?.updatedAt || 0).getTime()
      case 'type':
        return (a.name.split('.').pop() || '').localeCompare(b.name.split('.').pop() || '')
      case 'name':
      default:
        return a.name.localeCompare(b.name)
    }
  })

  // 面包屑路径
  const breadcrumbs = currentPath.split('/').filter(Boolean)

  return (
    <div className="flex h-full bg-card/30">
      {/* 左侧树形导航 */}
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索文件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {items.filter(i => i.type === 'folder').map(folder => (
            <TreeItem
              key={folder.id}
              item={folder}
              onToggle={toggleFolder}
              onSelect={onSelect}
              selectedId={selectedItems[0] || null}
            />
          ))}
        </div>
      </div>

      {/* 右侧主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 工具栏 */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4">
          {/* 面包屑 */}
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => onNavigate('/')}
              className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground"
            >
              <Folder className="w-4 h-4" />
            </button>
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center">
                <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
                <button
                  onClick={() => onNavigate('/' + breadcrumbs.slice(0, index + 1).join('/'))}
                  className="px-2 py-1 hover:bg-accent rounded-lg"
                >
                  {crumb}
                </button>
              </div>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            {/* 新建按钮 */}
            <div className="relative">
              <button
                onClick={() => setShowNewMenu(!showNewMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">新建</span>
              </button>
              
              {showNewMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNewMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden z-50 py-2"
                  >
                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">文档</div>
                    <button
                      onClick={() => { onCreateFile('document', 'markdown'); setShowNewMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <FileText className="w-4 h-4 text-gray-500" />
                      Markdown 文档 (.md)
                    </button>
                    <button
                      onClick={() => { onCreateFile('document', 'mindnest'); setShowNewMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <FileJson className="w-4 h-4 text-purple-500" />
                      MindNest 文档 (.mn)
                    </button>
                    <div className="h-px bg-border my-2" />
                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">其他</div>
                    <button
                      onClick={() => { onCreateFile('spreadsheet', 'mindnest'); setShowNewMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <Folder className="w-4 h-4 text-green-500" />
                      数据表
                    </button>
                    <button
                      onClick={() => { onCreateFile('whiteboard', 'mindnest'); setShowNewMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <Folder className="w-4 h-4 text-purple-500" />
                      画板
                    </button>
                    <button
                      onClick={() => { onCreateFolder(); setShowNewMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <FolderPlus className="w-4 h-4 text-gray-500" />
                      新建文件夹
                    </button>
                  </motion.div>
                </>
              )}
            </div>

            {/* 视图切换 */}
            <div className="flex items-center bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === 'list' ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === 'grid' ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Folder className="w-4 h-4" />
              </button>
            </div>

            {/* 刷新 */}
            <button className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 文件列表 */}
        <div className="flex-1 overflow-y-auto">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
              {filteredItems.map(item => (
                <GridItem
                  key={item.id}
                  item={item}
                  isSelected={selectedItems.includes(item.id)}
                  onClick={() => {
                    if (item.type === 'folder') {
                      onNavigate(item.path)
                    } else {
                      onSelectItems([item.id])
                    }
                  }}
                  onDoubleClick={() => onSelect(item)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setContextMenu({ x: e.clientX, y: e.clientY, item })
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredItems.map(item => (
                <ListItem
                  key={item.id}
                  item={item}
                  isSelected={selectedItems.includes(item.id)}
                  onClick={() => {
                    if (item.type === 'folder') {
                      onNavigate(item.path)
                    } else {
                      onSelectItems(selectedItems.includes(item.id)
                        ? selectedItems.filter(id => id !== item.id)
                        : [...selectedItems, item.id]
                      )
                    }
                  }}
                  onDoubleClick={() => onSelect(item)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setContextMenu({ x: e.clientX, y: e.clientY, item })
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* 状态栏 */}
        <div className="h-10 border-t border-border flex items-center justify-between px-4 text-xs text-muted-foreground">
          <span>{filteredItems.length} 个项目</span>
          <span>{selectedItems.length} 个选中</span>
        </div>
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          onClose={() => setContextMenu(null)}
          onRename={() => {
            const newName = prompt('新名称:', contextMenu.item.name)
            if (newName) onRename(contextMenu.item, newName)
          }}
          onDelete={() => onDelete(contextMenu.item)}
          onCopy={() => {}}
          onCut={() => {}}
          onDownload={() => {}}
        />
      )}
    </div>
  )
}

export default FileExplorer
