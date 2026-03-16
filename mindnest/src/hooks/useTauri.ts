// Tauri API 调用封装
import { invoke } from '@tauri-apps/api/core'

// ===== 类型定义 =====
export interface Document {
  id: string
  kbId: string
  parentId?: string
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

export interface KnowledgeBase {
  id: string
  workspaceId: string
  name: string
  description?: string
  icon?: string
  storagePath: string
  settings?: Record<string, any>
  createdAt?: string
  updatedAt?: string
}

export interface SearchResult {
  documentId: string
  title: string
  highlights: string[]
  score: number
}

export interface Settings {
  general: {
    theme: 'light' | 'dark' | 'system'
    language: string
    startupBehavior: string
    autoSaveInterval: number
    showLineNumbers: boolean
    fontSize: number
    fontFamily: string
  }
  editor: {
    wordWrap: string
    tabSize: number
    useSpacesForTabs: boolean
    showWhitespace: boolean
    spellCheck: boolean
    autoBrackets: boolean
    autoQuotes: boolean
    autoFormatPaste: boolean
  }
  ai: {
    enabled: boolean
    localModelPath: string | null
    preferredModel: string
    apiProvider: 'openai' | 'anthropic' | 'local'
    apiKey: string | null
    apiBaseUrl: string | null
    defaultTemperature: number
    maxTokens: number
    suggestionInterval: number
    autoCompletion: boolean
    smartTags: boolean
    // 新增翻译设置
    translateTargetLanguage: string
  }
  shortcuts: {
    save: string
    newDocument: string
    search: string
    commandPalette: string
    toggleSidebar: string
    togglePreview: string
    bold: string
    italic: string
    code: string
    link: string
  }
  privacy: {
    enableTelemetry: boolean
    autoCheckUpdates: boolean
    crashReporting: boolean
    e2eeSync: boolean
    syncProvider: string | null
  }
}

// ===== 文档相关 =====
export async function createDocument(
  kbId: string,
  title: string,
  content?: string,
  parentId?: string,
  folderId?: string
): Promise<Document> {
  return invoke('create_document', { 
    kbId, 
    title, 
    content: content || '', 
    parentId: parentId || null,
    folderId: folderId || null
  })
}

export async function getDocument(id: string): Promise<Document> {
  return invoke('get_document', { id })
}

export async function getDocumentContent(id: string): Promise<string> {
  return invoke('get_document_content', { id })
}

export async function updateDocument(
  id: string,
  title?: string,
  content?: string
): Promise<Document> {
  return invoke('update_document', { id, title, content })
}

export async function deleteDocument(id: string): Promise<void> {
  return invoke('delete_document', { id })
}

export async function moveDocument(id: string, parentId?: string, folderId?: string): Promise<Document> {
  return invoke('move_document', { id, parentId: parentId || null, folderId: folderId || null })
}

export async function listDocuments(kbId: string, parentId?: string, folderId?: string): Promise<Document[]> {
  return invoke('list_documents', { 
    kbId, 
    parentId: parentId || null,
    folderId: folderId || null
  })
}

export async function searchDocuments(query: string, kbId?: string): Promise<Document[]> {
  return invoke('search_documents', { query, kbId: kbId || null })
}

// ===== 知识库相关 =====
export async function createKnowledgeBase(
  workspaceId: string,
  name: string,
  description?: string,
  icon?: string
): Promise<KnowledgeBase> {
  return invoke('create_knowledge_base', { 
    workspaceId, 
    name, 
    description: description || '',
    icon: icon || '📚'
  })
}

export async function getKnowledgeBase(id: string): Promise<KnowledgeBase> {
  return invoke('get_knowledge_base', { id })
}

export async function listKnowledgeBases(workspaceId?: string): Promise<KnowledgeBase[]> {
  return invoke('list_knowledge_bases', { 
    workspaceId: workspaceId || 'default_workspace' 
  })
}

// ===== 文件夹相关 =====
export interface Folder {
  id: string
  kbId: string
  parentId?: string
  name: string
  icon?: string
  color?: string
  position?: number
  createdAt: string
  updatedAt: string
}

export async function createFolder(
  kbId: string,
  name: string,
  parentId?: string,
  icon?: string
): Promise<Folder> {
  return invoke('create_folder', { kbId, name, parentId: parentId || null, icon: icon || '📁' })
}

export async function listFolders(kbId: string): Promise<Folder[]> {
  return invoke('list_folders', { kbId })
}

export async function updateFolder(folder: Folder): Promise<Folder> {
  return invoke('update_folder', { folder })
}

export async function deleteFolder(id: string): Promise<void> {
  return invoke('delete_folder', { id })
}

// ===== 链接相关 =====
export async function getLinkedDocuments(docId: string): Promise<Document[]> {
  return invoke('get_linked_documents', { docId })
}

export async function getBacklinks(docId: string): Promise<Document[]> {
  return invoke('get_backlinks', { docId })
}

// ===== 搜索相关 =====
export async function fullTextSearch(
  query: string,
  kbId?: string,
  limit?: number
): Promise<SearchResult[]> {
  return invoke('full_text_search', { 
    query, 
    kbId: kbId || null, 
    limit: limit || 20 
  })
}

export async function semanticSearch(
  query: string,
  kbId?: string
): Promise<SearchResult[]> {
  return invoke('semantic_search', { 
    query, 
    kbId: kbId || null 
  })
}

export async function reindexDocument(docId: string): Promise<void> {
  return invoke('reindex_document', { docId })
}

export async function removeFromIndex(docId: string): Promise<void> {
  return invoke('remove_from_index', { docId })
}

export async function rebuildSearchIndex(): Promise<void> {
  return invoke('rebuild_search_index')
}

// ===== AI 相关 =====
export async function generateCompletion(
  prompt: string,
  context?: string,
  model?: string,
  temperature?: number
): Promise<{ content: string; tokensUsed?: number }> {
  return invoke('generate_completion', { 
    prompt, 
    context: context || '', 
    model: model || null, 
    temperature: temperature || null 
  })
}

export async function chatWithContext(
  messages: Array<{ role: string; content: string }>,
  contextDocIds?: string[]
): Promise<{ content: string }> {
  return invoke('chat_with_context', { 
    messages, 
    contextDocIds: contextDocIds || [] 
  })
}

export async function getSuggestions(
  content: string,
  cursorPosition: number
): Promise<{ suggestions: string[] }> {
  return invoke('get_suggestions', { content, cursorPosition })
}

export async function continueWriting(context: string): Promise<string> {
  // 调用通用的生成补全
  const result = await generateCompletion('继续写作', context)
  return result.content
}

export async function polishText(text: string): Promise<string> {
  const result = await generateCompletion('润色以下文本', text)
  return result.content
}

export async function generateSummary(content: string, maxLength?: number): Promise<string> {
  const result = await generateCompletion(
    `总结以下内容，限制在 ${maxLength || 200} 字以内`, 
    content
  )
  return result.content
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  const result = await generateCompletion(
    `将以下文本翻译成 ${targetLang}`, 
    text
  )
  return result.content
}

// ===== 系统相关 =====
export async function getAppInfo(): Promise<{ version: string; name: string }> {
  return invoke('get_app_info')
}

export async function openSettings(): Promise<void> {
  return invoke('open_settings')
}

// ===== 设置相关 =====
export async function getSettings(): Promise<Settings> {
  return invoke('get_settings')
}

export async function updateSettings(settings: Settings): Promise<Settings> {
  return invoke('update_settings', { settings })
}

export async function resetSettings(): Promise<Settings> {
  return invoke('reset_settings')
}

export async function exportSettings(): Promise<string> {
  return invoke('export_settings')
}

export async function importSettings(settingsJson: string): Promise<Settings> {
  return invoke('import_settings', { settingsJson })
}
