import { useState } from 'react'
import type { SpreadsheetData, SpreadsheetView, SpreadsheetViewType } from '../../../types/document'
import { 
  Table2, 
  LayoutGrid, 
  Calendar, 
  GalleryHorizontal,
  FormInput,
  BarChart3,
  Plus,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  Search,
  Settings2
} from 'lucide-react'
import { cn } from '../../../utils/cn'

interface SpreadsheetEditorProps {
  data: SpreadsheetData
  onChange: (data: SpreadsheetData) => void
}

const viewIcons: Record<SpreadsheetViewType, any> = {
  table: Table2,
  board: LayoutGrid,
  gallery: GalleryHorizontal,
  form: FormInput,
  calendar: Calendar,
  gantt: BarChart3
}

const viewNames: Record<SpreadsheetViewType, string> = {
  table: '表格',
  board: '看板',
  gallery: '画廊',
  form: '表单',
  calendar: '日历',
  gantt: '甘特图'
}

export function SpreadsheetEditor({ data, onChange }: SpreadsheetEditorProps) {
  const [activeViewId, setActiveViewId] = useState(data.views[0]?.id)
  const [searchQuery, setSearchQuery] = useState('')
  
  const { columns = [], rows = [], views = [] } = data
  const activeView = views.find(v => v.id === activeViewId) || views[0]

  const updateData = (updates: Partial<SpreadsheetData>) => {
    onChange({ ...data, ...updates })
  }

  const addRow = () => {
    const newRow: Record<string, any> = { id: `row_${Date.now()}` }
    columns.forEach(col => {
      if (col.type === 'checkbox') newRow[col.id] = false
      else if (col.type === 'select') newRow[col.id] = col.options?.[0] || ''
      else newRow[col.id] = ''
    })
    updateData({ rows: [...rows, newRow as any] })
  }

  const addColumn = () => {
    const newCol = {
      id: `col_${Date.now()}`,
      name: '新列',
      type: 'text' as const
    }
    updateData({ columns: [...columns, newCol] })
  }

  const updateCell = (rowId: string, colId: string, value: any) => {
    updateData({
      rows: rows.map(row => 
        row.id === rowId ? { ...row, [colId]: value } : row
      )
    })
  }

  const deleteRow = (rowId: string) => {
    updateData({ rows: rows.filter(r => r.id !== rowId) })
  }

  const renderCell = (row: any, col: any) => {
    const value = row[col.id]
    
    switch (col.type) {
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => updateCell(row.id, col.id, e.target.checked)}
            className="rounded border-border"
          />
        )
      
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => updateCell(row.id, col.id, e.target.value)}
            className="w-full bg-transparent border-none outline-none text-sm"
          >
            {col.options?.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )
      
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => updateCell(row.id, col.id, e.target.value)}
            className="w-full bg-transparent border-none outline-none text-sm"
          />
        )
      
      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => updateCell(row.id, col.id, e.target.value)}
            className="w-full bg-transparent border-none outline-none text-sm"
            placeholder="-"
          />
        )
    }
  }

  const renderTableView = () => (
    <div className="overflow-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="w-10 p-2 border border-border">
              <input type="checkbox" className="rounded border-border" />
            </th>
            {columns.map(col => (
              <th 
                key={col.id} 
                className="p-2 border border-border text-left text-sm font-medium text-muted-foreground whitespace-nowrap"
                style={{ minWidth: col.width || 120 }}
              >
                <div className="flex items-center gap-1">
                  {col.name}
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </div>
              </th>
            ))}
            <th className="w-10 p-2 border border-border">
              <button 
                onClick={addColumn}
                className="w-full flex justify-center text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-4 h-4" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id} className="hover:bg-muted/30 group">
              <td className="p-2 border border-border text-center text-sm text-muted-foreground">
                {index + 1}
              </td>
              {columns.map(col => (
                <td key={col.id} className="p-2 border border-border">
                  {renderCell(row, col)}
                </td>
              ))}
              <td className="p-2 border border-border">
                <button 
                  onClick={() => deleteRow(row.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* 添加行 */}
      <button
        onClick={addRow}
        className="w-full py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-b border-x border-border"
      >
        <Plus className="w-4 h-4" />
        添加行
      </button>
    </div>
  )

  const renderBoardView = () => {
    const groupBy = activeView?.groupBy
    if (!groupBy) return renderTableView()
    
    const groups = columns.find(c => c.id === groupBy)?.options || ['未分组']
    
    return (
      <div className="flex gap-4 overflow-x-auto p-4">
        {groups.map(group => (
          <div key={group} className="w-72 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">{group}</h3>
              <span className="text-xs text-muted-foreground">
                {rows.filter(r => r[groupBy] === group).length}
              </span>
            </div>
            <div className="space-y-2">
              {rows
                .filter(r => r[groupBy] === group)
                .map(row => (
                  <div 
                    key={row.id} 
                    className="p-3 bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    {columns.slice(0, 3).map(col => (
                      <div key={col.id} className="text-sm mb-1">
                        <span className="text-muted-foreground text-xs">{col.name}: </span>
                        <span>{String(row[col.id] || '-')}</span>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderGalleryView = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {rows.map(row => (
        <div 
          key={row.id}
          className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
        >
          <div className="h-32 bg-muted/50 flex items-center justify-center">
            <GalleryHorizontal className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <div className="p-3">
            <h3 className="font-medium text-sm truncate">
              {row[columns[0]?.id] || '无标题'}
            </h3>
            {columns.slice(1, 3).map(col => (
              <p key={col.id} className="text-xs text-muted-foreground mt-1 truncate">
                {col.name}: {String(row[col.id] || '-')}
              </p>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={addRow}
        className="border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors min-h-[200px]"
      >
        <Plus className="w-8 h-8" />
        <span className="text-sm">新建</span>
      </button>
    </div>
  )

  const renderCurrentView = () => {
    switch (activeView?.type) {
      case 'board': return renderBoardView()
      case 'gallery': return renderGalleryView()
      default: return renderTableView()
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-4">
          {/* 视图切换 */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {views.map(view => {
              const Icon = viewIcons[view.type]
              return (
                <button
                  key={view.id}
                  onClick={() => setActiveViewId(view.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all",
                    activeViewId === view.id
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{view.name}</span>
                </button>
              )
            })}
          </div>

          <div className="h-6 w-px bg-border" />

          {/* 搜索 */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-muted rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 w-48"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">筛选</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
            <ArrowUpDown className="w-4 h-4" />
            <span className="hidden sm:inline">排序</span>
          </button>
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 视图内容 */}
      <div className="flex-1 overflow-auto">
        {renderCurrentView()}
      </div>

      {/* 底部统计 */}
      <div className="px-4 py-2 border-t border-border bg-card/30 text-xs text-muted-foreground flex items-center justify-between">
        <span>{rows.length} 行数据</span>
        <span>{columns.length} 列</span>
      </div>
    </div>
  )
}
