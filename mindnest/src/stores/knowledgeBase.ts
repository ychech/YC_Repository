import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as tauri from '../hooks/useTauri'

export interface KnowledgeBase {
  id: string
  workspaceId: string
  name: string
  description?: string
  icon?: string
  storagePath: string
  settings?: Record<string, any>
  createdAt?: Date
  updatedAt?: Date
}

export interface Folder {
  id: string
  kbId: string
  parentId?: string
  name: string
  icon?: string
  position?: number
  createdAt: Date
  updatedAt: Date
}

interface KnowledgeBaseState {
  knowledgeBases: KnowledgeBase[]
  currentKbId: string | null
  folders: Folder[]
  currentFolderId: string | null
  isLoading: boolean
  error: string | null
  
  // Actions
  loadKnowledgeBases: (workspaceId?: string) => Promise<void>
  createKnowledgeBase: (name: string, description?: string, icon?: string) => Promise<KnowledgeBase | null>
  setCurrentKb: (kbId: string | null) => void
  deleteKnowledgeBase: (kbId: string) => Promise<void>
  
  // Folder actions - 使用后端存储
  loadFolders: (kbId: string) => Promise<void>
  createFolder: (kbId: string, name: string, parentId?: string) => Promise<Folder | null>
  updateFolder: (folderId: string, updates: Partial<Folder>) => Promise<void>
  setCurrentFolder: (folderId: string | null) => void
  deleteFolder: (folderId: string) => Promise<void>
  moveFolder: (folderId: string, targetParentId: string | null) => Promise<void>
  setFolders: (folders: Folder[]) => void
}

export const useKnowledgeBaseStore = create<KnowledgeBaseState>()(
  persist(
    (set, get) => ({
      knowledgeBases: [],
      currentKbId: null,
      folders: [],
      currentFolderId: null,
      isLoading: false,
      error: null,
      
      loadKnowledgeBases: async (workspaceId = 'default_workspace') => {
        if (get().isLoading) return
        
        set({ isLoading: true, error: null })
        try {
          console.log('[KBStore] Loading knowledge bases...')
          const kbs = await tauri.listKnowledgeBases(workspaceId)
          console.log('[KBStore] Loaded', kbs.length, 'knowledge bases')
          
          const formattedKbs = kbs.map(kb => ({
            ...kb,
            createdAt: kb.createdAt ? new Date(kb.createdAt) : undefined,
            updatedAt: kb.updatedAt ? new Date(kb.updatedAt) : undefined,
          }))
          
          set({ 
            knowledgeBases: formattedKbs,
            isLoading: false,
          })
          
          // 如果没有当前选中的知识库，选择第一个
          if (!get().currentKbId && formattedKbs.length > 0) {
            console.log('[KBStore] Auto-selecting first KB:', formattedKbs[0].id)
            set({ currentKbId: formattedKbs[0].id })
            // 加载该知识库的文件夹
            get().loadFolders(formattedKbs[0].id)
          }
        } catch (error) {
          console.error('[KBStore] Failed to load knowledge bases:', error)
          set({ isLoading: false, error: String(error) })
        }
      },
      
      createKnowledgeBase: async (name, description, icon = '📚') => {
        set({ isLoading: true, error: null })
        try {
          console.log('[KBStore] Creating knowledge base:', name)
          const kb = await tauri.createKnowledgeBase('default_workspace', name, description, icon)
          const newKb: KnowledgeBase = {
            ...kb,
            createdAt: kb.createdAt ? new Date(kb.createdAt) : new Date(),
            updatedAt: kb.updatedAt ? new Date(kb.updatedAt) : new Date(),
          }
          set((state) => ({
            knowledgeBases: [...state.knowledgeBases, newKb],
            currentKbId: newKb.id,
            isLoading: false,
          }))
          console.log('[KBStore] Knowledge base created:', newKb.id)
          return newKb
        } catch (error) {
          console.error('[KBStore] Failed to create knowledge base:', error)
          set({ error: String(error), isLoading: false })
          return null
        }
      },
      
      setCurrentKb: (kbId) => {
        if (kbId === get().currentKbId) return
        console.log('[KBStore] Setting current KB:', kbId)
        set({ currentKbId: kbId, currentFolderId: null, folders: [] })
        if (kbId) {
          get().loadFolders(kbId)
        }
      },
      
      deleteKnowledgeBase: async (kbId) => {
        set({ isLoading: true, error: null })
        try {
          set((state) => ({
            knowledgeBases: state.knowledgeBases.filter(kb => kb.id !== kbId),
            currentKbId: state.currentKbId === kbId ? null : state.currentKbId,
            isLoading: false,
          }))
        } catch (error) {
          set({ error: String(error), isLoading: false })
        }
      },
      
      // Folder actions - 使用后端存储
      loadFolders: async (kbId) => {
        if (!kbId) return
        try {
          console.log('[KBStore] Loading folders for KB:', kbId)
          const folders = await tauri.listFolders(kbId)
          console.log('[KBStore] Loaded', folders.length, 'folders')
          set({ 
            folders: folders.map(f => ({
              ...f,
              createdAt: new Date(f.createdAt),
              updatedAt: new Date(f.updatedAt),
            }))
          })
        } catch (error) {
          console.error('[KBStore] Failed to load folders:', error)
          set({ folders: [] })
        }
      },
      
      createFolder: async (kbId, name, parentId) => {
        try {
          console.log('[KBStore] Creating folder:', { kbId, name, parentId })
          const folder = await tauri.createFolder(kbId, name, parentId)
          const newFolder: Folder = {
            ...folder,
            createdAt: new Date(folder.createdAt),
            updatedAt: new Date(folder.updatedAt),
          }
          set((state) => ({
            folders: [...state.folders, newFolder]
          }))
          console.log('[KBStore] Folder created:', newFolder.id)
          return newFolder
        } catch (error) {
          console.error('[KBStore] Failed to create folder:', error)
          return null
        }
      },
      
      updateFolder: async (folderId, updates) => {
        set((state) => {
          const folder = state.folders.find(f => f.id === folderId)
          if (!folder) return state
          
          const updatedFolder = { ...folder, ...updates, updatedAt: new Date() }
          
          // 异步更新后端
          tauri.updateFolder({
            ...updatedFolder,
            createdAt: updatedFolder.createdAt.toISOString(),
            updatedAt: updatedFolder.updatedAt.toISOString(),
          } as any).catch(console.error)
          
          return {
            folders: state.folders.map(f => 
              f.id === folderId ? updatedFolder : f
            )
          }
        })
      },
      
      setCurrentFolder: (folderId) => {
        set({ currentFolderId: folderId })
      },
      
      deleteFolder: async (folderId) => {
        try {
          await tauri.deleteFolder(folderId)
          set((state) => ({
            folders: state.folders.filter(f => f.id !== folderId),
            currentFolderId: state.currentFolderId === folderId ? null : state.currentFolderId,
          }))
        } catch (error) {
          console.error('[KBStore] Failed to delete folder:', error)
          throw error
        }
      },

      moveFolder: async (folderId, targetParentId) => {
        try {
          set((state) => ({
            folders: state.folders.map(f =>
              f.id === folderId
                ? { ...f, parentId: targetParentId || undefined, updatedAt: new Date() }
                : f
            )
          }))
          
          // 更新后端
          const folder = get().folders.find(f => f.id === folderId)
          if (folder) {
            await tauri.updateFolder({
              ...folder,
              parentId: targetParentId || undefined,
              updatedAt: new Date().toISOString(),
            } as any)
          }
        } catch (error) {
          console.error('[KBStore] Failed to move folder:', error)
          throw error
        }
      },

      setFolders: (folders) => {
        set({ folders })
      },
    }),
    {
      name: 'kb-storage',
      partialize: (state) => ({ 
        knowledgeBases: state.knowledgeBases,
        currentKbId: state.currentKbId,
        currentFolderId: state.currentFolderId,
      }),
    }
  )
)
