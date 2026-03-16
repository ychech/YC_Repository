import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { CommandPalette } from './CommandPalette'
import { useState, useEffect } from 'react'
import { useSettingsStore } from '../stores/settings'
import { useKnowledgeBaseStore } from '../stores/knowledgeBase'

export function Layout() {
  const [commandOpen, setCommandOpen] = useState(false)
  const { loadSettings, applyTheme } = useSettingsStore()
  const { loadKnowledgeBases } = useKnowledgeBaseStore()

  // 初始化设置和主题
  useEffect(() => {
    const init = async () => {
      await loadSettings()
      applyTheme()
      await loadKnowledgeBases()
    }
    init()
  }, [loadSettings, applyTheme, loadKnowledgeBases])

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
