import { Outlet } from 'react-router-dom'
import { NewSidebar as Sidebar } from './sidebar/NewSidebar'
import { CommandPalette } from './CommandPalette'
import { DndProvider, DragOverlay } from './dnd'
import { useState, useEffect, useCallback } from 'react'
import { useSettingsStore } from '../stores/settings'
import { useKnowledgeBaseStore } from '../stores/knowledgeBase'
import { useDocumentStore } from '../stores/document'
import { DocItem } from './dnd/DocItem'
import type { DragEndEvent, DragStartEvent, DragOverEvent, UniqueIdentifier } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'

// 拖拽状态类型
interface DragState {
  activeId: string | null
  activeType: 'document' | 'folder' | null
  overId: string | null
  overType: 'document' | 'folder' | null
}

export function Layout() {
  const [commandOpen, setCommandOpen] = useState(false)
  const [activeDoc, setActiveDoc] = useState<{ id: string; title: string; type: string; folderId: string } | null>(null)
  const [dragState, setDragState] = useState<DragState>({
    activeId: null,
    activeType: null,
    overId: null,
    overType: null,
  })
  
  const { loadSettings, applyTheme } = useSettingsStore()
  const { loadKnowledgeBases, currentKbId, folders, moveFolder, setFolders } = useKnowledgeBaseStore()
  const { documents, moveDocument, setDocuments } = useDocumentStore()

  // 初始化设置和主题
  useEffect(() => {
    const init = async () => {
      await loadSettings()
      applyTheme()
      await loadKnowledgeBases()
    }
    init()
  }, [loadSettings, applyTheme, loadKnowledgeBases])

  // 处理拖拽开始
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const data = active.data.current
    const activeId = active.id.toString()
    
    if (data?.type === 'document') {
      setActiveDoc({
        id: data.id,
        title: data.title,
        type: data.docType || 'document',
        folderId: data.folderId || '',
      })
      setDragState({
        activeId,
        activeType: 'document',
        overId: null,
        overType: null,
      })
    } else if (data?.type === 'folder' || data?.isFolder) {
      setDragState({
        activeId,
        activeType: 'folder',
        overId: null,
        overType: null,
      })
    }
  }, [])

  // 处理拖拽经过
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setDragState(prev => ({ ...prev, overId: null, overType: null }))
      return
    }

    const overId = over.id.toString()
    const overData = over.data.current
    
    setDragState(prev => ({
      ...prev,
      overId,
      overType: overData?.type || null,
    }))
  }, [])

  // 处理拖拽结束
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    
    // 重置状态
    setActiveDoc(null)
    setDragState({ activeId: null, activeType: null, overId: null, overType: null })

    if (!active || !over) {
      console.log('[DragEnd] No active or over')
      return
    }

    const activeId = active.id.toString()
    const overId = over.id.toString()
    const activeData = active.data.current
    const overData = over.data.current

    console.log('[DragEnd]', { activeId, overId, activeData, overData })

    if (!activeData) return

    // 处理文档拖拽
    if (activeData.type === 'document') {
      await handleDocumentDrag(activeId, overId, activeData, overData, event)
    }
    // 处理文件夹拖拽
    else if (activeData.type === 'folder' || activeData.isFolder) {
      await handleFolderDrag(activeId, overId, activeData, overData)
    }
  }, [currentKbId, documents, folders])

  // 处理文档拖拽
  const handleDocumentDrag = async (
    activeId: string,
    overId: string,
    activeData: any,
    overData: any,
    event: DragEndEvent
  ) => {
    const sourceFolderId = (activeData.folderId as string) || ''
    
    // 确定目标文件夹
    let targetFolderId = sourceFolderId
    let insertAfter = false // 是否在目标文档之后插入

    // 解析目标
    if (overId.startsWith('folder-')) {
      // 放置到文件夹区域
      targetFolderId = overId.replace('folder-', '')
    } else if (overData?.type === 'document') {
      // 放置到另一个文档上
      targetFolderId = (overData.folderId as string) || ''
      
      // 判断是否放在文档下方（通过计算鼠标位置）
      const { delta } = event
      if (delta && delta.y > 10) {
        insertAfter = true
      }
    } else if (overData?.type === 'folder') {
      targetFolderId = overData.folderId || overData.id
    }

    console.log('[DragEnd] Document:', { sourceFolderId, targetFolderId, insertAfter })

    if (sourceFolderId === targetFolderId) {
      // 同文件夹内排序
      await handleSameFolderReorder(activeId, overId, sourceFolderId, insertAfter)
    } else {
      // 跨文件夹移动
      await handleCrossFolderMove(activeId, sourceFolderId, targetFolderId)
    }
  }

  // 同文件夹内重新排序
  const handleSameFolderReorder = async (
    activeId: string,
    overId: string,
    folderId: string,
    insertAfter: boolean
  ) => {
    const folderDocs = documents
      .filter(d => (d.parentId || '') === folderId)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
    
    const oldIndex = folderDocs.findIndex(d => d.id === activeId)
    let newIndex = folderDocs.findIndex(d => d.id === overId)
    
    if (oldIndex === -1) return
    if (newIndex === -1) newIndex = folderDocs.length - 1
    
    // 如果在文档下方插入，位置+1
    if (insertAfter && newIndex < folderDocs.length - 1) {
      newIndex += 1
    }
    
    if (oldIndex === newIndex) return

    console.log('[DragEnd] Reorder:', { oldIndex, newIndex })

    const reorderedDocs = arrayMove(folderDocs, oldIndex, newIndex)
    
    const updatedDocs = documents.map(doc => {
      const idx = reorderedDocs.findIndex(d => d.id === doc.id)
      if (idx !== -1) {
        return { ...doc, position: (idx + 1) * 1000 }
      }
      return doc
    })
    
    setDocuments(updatedDocs)
    
    if (currentKbId) {
      await moveDocument(activeId, currentKbId, undefined, folderId, (newIndex + 1) * 1000)
    }
  }

  // 跨文件夹移动
  const handleCrossFolderMove = async (
    activeId: string,
    sourceFolderId: string,
    targetFolderId: string
  ) => {
    const targetDocs = documents
      .filter(d => (d.parentId || '') === targetFolderId && d.id !== activeId)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
    
    // 放到目标文件夹末尾
    let newPosition = 1000
    if (targetDocs.length > 0) {
      newPosition = (targetDocs[targetDocs.length - 1].position || 0) + 1000
    }

    const updatedDocs = documents.map(d =>
      d.id === activeId
        ? { ...d, parentId: targetFolderId || undefined, position: newPosition }
        : d
    )
    
    setDocuments(updatedDocs)

    if (currentKbId) {
      await moveDocument(activeId, currentKbId, undefined, targetFolderId || null, newPosition)
    }
  }

  // 处理文件夹拖拽
  const handleFolderDrag = async (
    activeId: string,
    overId: string,
    activeData: any,
    overData: any
  ) => {
    // 提取源文件夹ID
    const sourceFolderId = activeData.id || activeId.replace('folder-', '')
    
    // 确定目标父文件夹
    let targetParentId: string | null = null

    // 解析目标
    if (overId.startsWith('folder-')) {
      const targetId = overId.replace('folder-', '')
      // 特殊处理：如果目标是 "ungrouped"，表示根级
      if (targetId === 'ungrouped') {
        targetParentId = null
      } else if (targetId !== sourceFolderId) {
        targetParentId = targetId
      }
    } else if (overData?.type === 'folder' || overData?.isFolder) {
      const targetId = overData.id || overData.folderId
      if (targetId && targetId !== sourceFolderId) {
        targetParentId = targetId
      }
    }

    console.log('[DragEnd] Folder move:', { sourceFolderId, targetParentId, overId, overData })

    // 获取源文件夹
    const sourceFolder = folders.find(f => f.id === sourceFolderId)
    if (!sourceFolder) {
      console.log('[DragEnd] Source folder not found')
      return
    }

    // 如果目标父文件夹和源相同，不做处理
    if (sourceFolder.parentId === targetParentId) {
      console.log('[DragEnd] Same parent, no change')
      return
    }

    // 检查循环引用
    if (targetParentId) {
      let current: typeof sourceFolder | undefined = folders.find(f => f.id === targetParentId)
      while (current) {
        if (current.id === sourceFolderId) {
          console.log('[DragEnd] Circular reference!')
          alert('不能将文件夹移动到其子文件夹中')
          return
        }
        current = current.parentId 
          ? folders.find(f => f.id === current!.parentId)
          : undefined
      }
    }

    // 更新文件夹
    const updatedFolders = folders.map(f =>
      f.id === sourceFolderId
        ? { ...f, parentId: targetParentId || undefined, updatedAt: new Date() }
        : f
    )
    
    setFolders(updatedFolders)

    // 同步到后端
    if (currentKbId) {
      try {
        await moveFolder(sourceFolderId, targetParentId)
      } catch (error) {
        console.error('[DragEnd] Failed to move folder:', error)
      }
    }
  }

  return (
    <DndProvider onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      </div>

      {/* 拖拽时的悬浮预览 */}
      <DragOverlay dropAnimation={null}>
        {activeDoc ? (
          <DocItem
            id={activeDoc.id}
            title={activeDoc.title}
            type={activeDoc.type as any}
            folderId={activeDoc.folderId}
            level={0}
            isActive={false}
            isOverlay={true}
            onDelete={() => {}}
            onClick={() => {}}
          />
        ) : null}
      </DragOverlay>
    </DndProvider>
  )
}
