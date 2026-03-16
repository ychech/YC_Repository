import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, Settings, Sparkles, Plus, X } from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  const handleSelect = (value: string) => {
    onOpenChange(false)
    setSearch('')
    switch (value) {
      case 'new-doc':
        navigate('/doc/new')
        break
      case 'search':
        navigate('/search')
        break
      case 'settings':
        navigate('/settings')
        break
    }
  }

  if (!open) return null

  const items = [
    { id: 'new-doc', title: '新建文档', icon: Plus, shortcut: '⌘N' },
    { id: 'search', title: '搜索文档', icon: Search, shortcut: '⌘K' },
    { id: 'settings', title: '设置', icon: Settings, shortcut: '⌘,' },
  ].filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative w-full max-w-2xl bg-popover border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center border-b border-border px-4">
          <Search className="w-5 h-5 text-muted-foreground mr-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="输入命令或搜索..."
            className="flex-1 py-4 bg-transparent outline-none text-lg placeholder:text-muted-foreground"
            autoFocus
          />
          <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-accent rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              没有找到相关命令
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase">
                快速操作
              </div>
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent group text-left"
                >
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1">{item.title}</span>
                  <kbd className="px-2 py-0.5 text-xs bg-muted rounded text-muted-foreground">
                    {item.shortcut}
                  </kbd>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
