import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Document, DocumentType, SpreadsheetData, WhiteboardData, NoteData } from '../types/document'
import * as tauri from '../hooks/useTauri'
import { useSettingsStore } from './settings'

export type { Document, DocumentType }

// 后端返回的文档格式
interface BackendDocument {
  id: string
  kbId: string
  parentId?: string
  folderId?: string  // 关联到文件夹
  title: string
  contentType: 'markdown' | 'database' | 'canvas'
  filePath: string
  fileSize: number
  wordCount: number
  readingTime: number
  isPinned: boolean
  isFavorite: boolean
  status: 'active' | 'archived' | 'deleted'
  createdAt: string
  updatedAt: string
}

interface DocumentState {
  documents: Document[]
  recentDocuments: Document[]
  currentDocument: Document | null
  isLoading: boolean
  error: string | null
  hasInitialized: boolean  // 防止重复加载
  _saveTimer: ReturnType<typeof setTimeout> | null  // 防抖计时器
  
  // Actions
  createDocument: (kbId: string, title: string, content?: string, parentId?: string, type?: DocumentType) => Promise<Document | null>
  loadDocument: (id: string) => Promise<Document | null>
  loadDocumentContent: (id: string) => Promise<string>
  updateDocument: (id: string, updates: { title?: string; content?: string }) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  setCurrentDocument: (doc: Document | null) => void
  loadRecentDocuments: () => Promise<void>
  listDocuments: (kbId: string, parentId?: string | null, folderId?: string | null) => Promise<Document[]>
  loadAllDocuments: (kbId: string) => Promise<Document[]>
  moveDocument: (docId: string, targetKbId?: string, targetParentId?: string | null, targetFolderId?: string | null, position?: number) => Promise<void>
  
  // 类型特定的更新
  updateSpreadsheetData: (id: string, data: SpreadsheetData) => void
  updateWhiteboardData: (id: string, data: WhiteboardData) => void
  updateNoteData: (id: string, data: NoteData) => void
  
  // 获取不同类型的文档
  getDocumentsByType: (type: DocumentType) => Document[]
  getDocumentsByKb: (kbId: string) => Document[]
  getDocumentsByParent: (parentId: string | null) => Document[]
  
  // 拖拽排序
  reorderDocuments: (docIds: string[]) => void
  
  // 直接设置文档列表（用于本地更新）
  setDocuments: (docs: Document[]) => void
}

// 转换后端文档格式为前端格式
function convertBackendDoc(backend: BackendDocument): Document {
  const type = 
    (backend.contentType === 'database' ? 'spreadsheet' :
    backend.contentType === 'canvas' ? 'whiteboard' : 'document') as DocumentType
  
  // 为不同类型初始化默认 data
  let data: any = undefined
  if (type === 'whiteboard') {
    data = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
  } else if (type === 'spreadsheet') {
    data = { columns: [], rows: [], views: [] }
  } else if (type === 'note') {
    data = { content: '', images: [], tags: [] }
  }
  
  return {
    id: backend.id,
    type,
    title: backend.title,
    content: undefined, // 需要单独加载
    data,
    kbId: backend.kbId,
    // folderId 优先于 parentId，用于关联文件夹
    parentId: backend.folderId || backend.parentId,
    isPinned: backend.isPinned,
    isFavorite: backend.isFavorite,
    createdAt: new Date(backend.createdAt),
    updatedAt: new Date(backend.updatedAt),
    meta: {
      wordCount: backend.wordCount,
      readingTime: backend.readingTime,
    }
  }
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      documents: [],
      recentDocuments: [],
      currentDocument: null,
      isLoading: false,
      error: null,
      hasInitialized: false,
      _saveTimer: null,
      
      createDocument: async (kbId, title, content, parentId, type) => {
        set({ isLoading: true, error: null })
        try {
          console.log('[DocumentStore] Creating document:', { kbId, title, parentId, type })
          // 映射前端类型到后端 contentType
          const contentType = 
            type === 'spreadsheet' ? 'database' :
            type === 'whiteboard' ? 'canvas' : 'markdown'
          // parentId 作为 folderId 传递给后端（用于关联文件夹）
          const backendDoc = await tauri.createDocument(
            kbId, 
            title, 
            content || '', 
            undefined,  // parentId 用于文档父子关系
            parentId,   // folderId 用于关联文件夹
            contentType // 文档类型
          ) as BackendDocument
          const doc = convertBackendDoc(backendDoc)
          
          // 如果有内容，更新 content
          if (content) {
            doc.content = content
          }
          
          set((state) => ({
            documents: [...state.documents, doc],
            currentDocument: doc,
            isLoading: false,
          }))
          
          console.log('[DocumentStore] Document created:', doc.id)
          return doc
        } catch (error) {
          console.error('[DocumentStore] Failed to create document:', error)
          set({ error: String(error), isLoading: false })
          return null
        }
      },
      
      loadDocument: async (id) => {
        set({ isLoading: true, error: null })
        try {
          console.log('[DocumentStore] Loading document:', id)
          const backendDoc = await tauri.getDocument(id) as BackendDocument
          const doc = convertBackendDoc(backendDoc)
          
          // 加载内容
          try {
            const content = await tauri.getDocumentContent(id)
            doc.content = content
          } catch (e) {
            console.warn('[DocumentStore] Failed to load content:', e)
            doc.content = ''
          }
          
          set((state) => ({
            documents: state.documents.map((d) =>
              d.id === id ? { ...d, ...doc } : d
            ),
            currentDocument: doc,
            isLoading: false,
          }))
          
          return doc
        } catch (error) {
          console.error('[DocumentStore] Failed to load document:', error)
          set({ error: String(error), isLoading: false })
          return null
        }
      },
      
      loadDocumentContent: async (id) => {
        try {
          const content = await tauri.getDocumentContent(id)
          set((state) => ({
            documents: state.documents.map((d) =>
              d.id === id ? { ...d, content } : d
            ),
            currentDocument: state.currentDocument?.id === id 
              ? { ...state.currentDocument, content } 
              : state.currentDocument,
          }))
          return content
        } catch (error) {
          console.error('[DocumentStore] Failed to load content:', error)
          return ''
        }
      },
      
      updateDocument: async (id, updates) => {
        // 本地立即更新（乐观更新）
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id 
              ? { ...d, ...updates, updatedAt: new Date() } 
              : d
          ),
          currentDocument: state.currentDocument?.id === id 
            ? { ...state.currentDocument, ...updates, updatedAt: new Date() } 
            : state.currentDocument,
        }))
        
        // 获取自动保存间隔（秒）
        const autoSaveInterval = useSettingsStore.getState().settings.general.autoSaveInterval
        
        // 如果禁用自动保存，不执行后端保存
        if (autoSaveInterval === 0) {
          return
        }
        
        // 防抖保存到后端
        const state = get()
        if (state._saveTimer) {
          clearTimeout(state._saveTimer)
        }
        
        const delayMs = autoSaveInterval * 1000 // 转换为毫秒
        const timer = setTimeout(async () => {
          try {
            await tauri.updateDocument(id, updates.title, updates.content)
            console.log('[DocumentStore] Auto saved:', id, `(${autoSaveInterval}s)`)
          } catch (error) {
            console.error('[DocumentStore] Failed to save document:', error)
            set({ error: String(error) })
          }
        }, delayMs)
        
        set({ _saveTimer: timer })
      },
      
      deleteDocument: async (id) => {
        set({ isLoading: true, error: null })
        try {
          await tauri.deleteDocument(id)
          set((state) => ({
            documents: state.documents.filter((doc) => doc.id !== id),
            currentDocument: state.currentDocument?.id === id ? null : state.currentDocument,
            isLoading: false,
          }))
        } catch (error) {
          console.error('[DocumentStore] Failed to delete document:', error)
          set({ error: String(error), isLoading: false })
          throw error
        }
      },
      
      setCurrentDocument: (doc) => {
        set({ currentDocument: doc })
      },
      
      loadRecentDocuments: async () => {
        const docs = get().documents
          .slice()
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .slice(0, 5)
        set({ recentDocuments: docs })
      },
      
      listDocuments: async (kbId, parentId = null, folderId = null) => {
        if (!kbId) {
          console.warn('[DocumentStore] listDocuments called without kbId')
          return []
        }
        
        set({ isLoading: true, error: null })
        try {
          console.log('[DocumentStore] Loading documents from backend:', { kbId, parentId, folderId })
          const backendDocs = await tauri.listDocuments(
            kbId, 
            parentId || undefined,
            folderId || undefined
          ) as BackendDocument[]
          const docs = backendDocs.map(convertBackendDoc)
          
          set((state) => {
            // 合并新加载的文档与现有文档，保留其他知识库的文档
            const otherKbDocs = state.documents.filter(d => d.kbId !== kbId)
            return {
              documents: [...otherKbDocs, ...docs],
              isLoading: false,
              hasInitialized: true,
            }
          })
          
          return docs
        } catch (error) {
          console.error('[DocumentStore] Failed to list documents:', error)
          set({ error: String(error), isLoading: false, hasInitialized: true })
          return []
        }
      },
      
      loadAllDocuments: async (kbId) => {
        if (!kbId) return []
        set({ isLoading: true, error: null })
        try {
          const backendDocs = await tauri.listAllDocuments(kbId) as BackendDocument[]
          const docs = backendDocs.map(convertBackendDoc)
          set((state) => ({
            documents: [...state.documents.filter(d => d.kbId !== kbId), ...docs],
            isLoading: false,
          }))
          return docs
        } catch (error) {
          console.error('[DocumentStore] Failed to load all documents:', error)
          set({ error: String(error), isLoading: false })
          return []
        }
      },
      
      moveDocument: async (docId, targetKbId, targetParentId, targetFolderId, position) => {
        try {
          console.log('[DocumentStore] Moving document:', { docId, targetKbId, targetParentId, targetFolderId, position })
          
          // 调用后端 API - 使用 null 来清除 folder_id，传递 position
          const folderIdParam = targetFolderId === null ? null : (targetFolderId || undefined)
          await tauri.moveDocument(docId, targetParentId || undefined, folderIdParam, position)
          
          // 本地更新
          set((state) => ({
            documents: state.documents.map(doc => 
              doc.id === docId 
                ? { 
                    ...doc, 
                    kbId: targetKbId || doc.kbId, 
                    parentId: targetFolderId === null ? undefined : (targetFolderId || targetParentId || undefined),
                    position: position !== undefined ? position : doc.position
                  }
                : doc
            )
          }))
          
          console.log('[DocumentStore] Document moved successfully')
        } catch (error) {
          console.error('[DocumentStore] Failed to move document:', error)
        }
      },
      
      updateSpreadsheetData: (id, data) => {
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === id ? { ...doc, data, updatedAt: new Date() } : doc
          ),
        }))
      },
      
      updateWhiteboardData: (id, data) => {
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === id ? { ...doc, data, updatedAt: new Date() } : doc
          ),
        }))
      },
      
      updateNoteData: (id, data) => {
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === id ? { ...doc, data, content: data.content, updatedAt: new Date() } : doc
          ),
        }))
      },
      
      getDocumentsByType: (type) => {
        return get().documents.filter(d => d.type === type)
      },
      
      getDocumentsByKb: (kbId) => {
        return get().documents.filter(d => d.kbId === kbId)
      },
      
      getDocumentsByParent: (parentId) => {
        if (parentId === null) {
          return get().documents.filter(d => !d.parentId)
        }
        return get().documents.filter(d => d.parentId === parentId)
      },
      
      reorderDocuments: (docIds) => {
        // 根据 docIds 顺序重新排序文档
        const docs = get().documents
        const orderedDocs = docIds
          .map(id => docs.find(d => d.id === id))
          .filter(Boolean) as Document[]
        const otherDocs = docs.filter(d => !docIds.includes(d.id))
        set({ documents: [...orderedDocs, ...otherDocs] })
      },
      
      setDocuments: (docs) => {
        set({ documents: docs })
      },
    }),
    {
      name: 'document-storage',
      partialize: (state) => ({ 
        // 不持久化 documents，从后端加载
        recentDocuments: state.recentDocuments,
        hasInitialized: state.hasInitialized,
      }),
      onRehydrateStorage: () => (state) => {
        // 重新水合后恢复 Date 对象
        if (state?.recentDocuments) {
          state.recentDocuments.forEach((doc: any) => {
            if (doc.createdAt) doc.createdAt = new Date(doc.createdAt)
            if (doc.updatedAt) doc.updatedAt = new Date(doc.updatedAt)
          })
        }
      },
    }
  )
)
