import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  StorageConfig, 
  StorageFormat, 
  DocumentMetadata, 
  MindNestDocument,
  FileSystemItem,
  ExportOptions,
  ImportResult 
} from '../types/storage'

// 序列化文档为不同格式
export const serializeDocument = {
  // Markdown 格式 (Obsidian 兼容)
  toMarkdown: (doc: MindNestDocument): string => {
    const { metadata, blocks, content } = doc
    
    // YAML Frontmatter
    const frontmatter = `---
id: ${metadata.id}
title: ${metadata.title}
created: ${metadata.createdAt}
updated: ${metadata.updatedAt}
tags: [${metadata.tags.map(t => `"${t}"`).join(', ')}]
type: ${metadata.type}
---

`
    
    // 内容部分
    let body = ''
    if (blocks && blocks.length > 0) {
      // 从块生成 Markdown
      body = blocks.map(block => {
        switch (block.type) {
          case 'heading1': return `# ${block.content}`
          case 'heading2': return `## ${block.content}`
          case 'heading3': return `### ${block.content}`
          case 'heading4': return `#### ${block.content}`
          case 'bulletList': return `- ${block.content}`
          case 'orderedList': return `1. ${block.content}`
          case 'taskList': return `- [${block.meta?.checked ? 'x' : ' '}] ${block.content}`
          case 'quote': return `> ${block.content}`
          case 'code': 
            const lang = block.meta?.language || ''
            return `\`\`\`${lang}\n${block.content}\n\`\`\``
          case 'divider': return '---'
          case 'callout': 
            const style = block.meta?.style || 'info'
            return `> [!${style.toUpperCase()}]\n> ${block.content}`
          case 'image': return `![${block.meta?.alt || ''}](${block.content})`
          default: return block.content
        }
      }).join('\n\n')
    } else if (content) {
      body = content
    }
    
    return frontmatter + body
  },

  // MindNest 原生格式 (.mn) - JSON
  toMindNest: (doc: MindNestDocument): string => {
    return JSON.stringify(doc, null, 2)
  },

  // Hybrid 格式 - Markdown + 块数据嵌入
  toHybrid: (doc: MindNestDocument): string => {
    const markdown = serializeDocument.toMarkdown(doc)
    const blockData = `<!-- MINDNEST_DATA\n${JSON.stringify(doc.blocks || [], null, 2)}\n-->`
    return markdown + '\n\n' + blockData
  }
}

// 反序列化
export const deserializeDocument = {
  // 从 Markdown 解析
  fromMarkdown: (content: string, path: string): MindNestDocument => {
    // 解析 YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/)
    let metadata: DocumentMetadata = {
      id: path.split('/').pop()?.replace('.md', '') || '',
      title: '无标题',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      type: 'document',
      format: 'markdown',
      version: 1
    }
    
    let body = content
    
    if (frontmatterMatch) {
      const yamlContent = frontmatterMatch[1]
      body = content.slice(frontmatterMatch[0].length)
      
      // 简单解析 YAML
      yamlContent.split('\n').forEach(line => {
        const [key, ...values] = line.split(':')
        if (key && values.length > 0) {
          const value = values.join(':').trim()
          if (key === 'id') metadata.id = value
          if (key === 'title') metadata.title = value
          if (key === 'created') metadata.createdAt = value
          if (key === 'updated') metadata.updatedAt = value
          if (key === 'tags') {
            metadata.tags = value.replace(/[\[\]"]/g, '').split(',').map(t => t.trim()).filter(Boolean)
          }
          if (key === 'type') metadata.type = value as any
        }
      })
    }
    
    // 解析正文为块
    const blocks: any[] = []
    const lines = body.split('\n')
    let currentBlock: any = null
    let codeBlockContent: string[] = []
    let inCodeBlock = false
    let codeLanguage = ''
    
    lines.forEach(line => {
      // 代码块处理
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true
          codeLanguage = line.slice(3).trim()
          if (currentBlock) {
            blocks.push(currentBlock)
            currentBlock = null
          }
        } else {
          inCodeBlock = false
          blocks.push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'code',
            content: codeBlockContent.join('\n'),
            meta: { language: codeLanguage || 'plaintext' }
          })
          codeBlockContent = []
        }
        return
      }
      
      if (inCodeBlock) {
        codeBlockContent.push(line)
        return
      }
      
      // 普通行处理
      const trimmed = line.trim()
      if (!trimmed) return
      
      // 标题
      if (line.startsWith('# ')) {
        if (currentBlock) blocks.push(currentBlock)
        currentBlock = { id: Math.random().toString(36).substr(2, 9), type: 'heading1', content: line.slice(2) }
      } else if (line.startsWith('## ')) {
        if (currentBlock) blocks.push(currentBlock)
        currentBlock = { id: Math.random().toString(36).substr(2, 9), type: 'heading2', content: line.slice(3) }
      } else if (line.startsWith('### ')) {
        if (currentBlock) blocks.push(currentBlock)
        currentBlock = { id: Math.random().toString(36).substr(2, 9), type: 'heading3', content: line.slice(4) }
      } else if (line.startsWith('#### ')) {
        if (currentBlock) blocks.push(currentBlock)
        currentBlock = { id: Math.random().toString(36).substr(2, 9), type: 'heading4', content: line.slice(5) }
      }
      // 任务列表
      else if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
        if (currentBlock) blocks.push(currentBlock)
        currentBlock = { 
          id: Math.random().toString(36).substr(2, 9), 
          type: 'taskList', 
          content: line.slice(6),
          meta: { checked: line.startsWith('- [x] ') }
        }
      }
      // 无序列表
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        if (currentBlock) blocks.push(currentBlock)
        currentBlock = { id: Math.random().toString(36).substr(2, 9), type: 'bulletList', content: line.slice(2) }
      }
      // 有序列表
      else if (/^\d+\.\s/.test(line)) {
        if (currentBlock) blocks.push(currentBlock)
        currentBlock = { id: Math.random().toString(36).substr(2, 9), type: 'orderedList', content: line.replace(/^\d+\.\s/, '') }
      }
      // 引用
      else if (line.startsWith('> ')) {
        if (currentBlock) blocks.push(currentBlock)
        currentBlock = { id: Math.random().toString(36).substr(2, 9), type: 'quote', content: line.slice(2) }
      }
      // Obsidian 风格 callout
      else if (line.startsWith('> [!')) {
        if (currentBlock) blocks.push(currentBlock)
        const style = line.match(/\[!(\w+)\]/)?.[1] || 'info'
        currentBlock = { 
          id: Math.random().toString(36).substr(2, 9), 
          type: 'callout', 
          content: line.slice(line.indexOf(']') + 1).trim(),
          meta: { style: style.toLowerCase() }
        }
      }
      // 分割线
      else if (line === '---' || line === '***') {
        if (currentBlock) blocks.push(currentBlock)
        blocks.push({ id: Math.random().toString(36).substr(2, 9), type: 'divider', content: '' })
        currentBlock = null
      }
      // 图片
      else if (line.match(/!\[.*?\]\(.*?\)/)) {
        if (currentBlock) blocks.push(currentBlock)
        const match = line.match(/!\[(.*?)\]\((.*?)\)/)
        currentBlock = { 
          id: Math.random().toString(36).substr(2, 9), 
          type: 'image', 
          content: match?.[2] || '',
          meta: { alt: match?.[1] || '' }
        }
      }
      // 段落
      else {
        if (currentBlock?.type === 'paragraph') {
          currentBlock.content += '\n' + line
        } else {
          if (currentBlock) blocks.push(currentBlock)
          currentBlock = { id: Math.random().toString(36).substr(2, 9), type: 'paragraph', content: line }
        }
      }
    })
    
    if (currentBlock) blocks.push(currentBlock)
    
    return {
      metadata,
      blocks,
      content: body
    }
  },

  // 从 MindNest 格式解析
  fromMindNest: (content: string): MindNestDocument => {
    return JSON.parse(content)
  },

  // 从 Hybrid 格式解析
  fromHybrid: (content: string): MindNestDocument => {
    const doc = deserializeDocument.fromMarkdown(content, '')
    // 提取隐藏的块数据
    const dataMatch = content.match(/<!-- MINDNEST_DATA\n([\s\S]*?)\n-->/)
    if (dataMatch) {
      try {
        doc.blocks = JSON.parse(dataMatch[1])
      } catch (e) {
        console.error('Failed to parse hybrid data:', e)
      }
    }
    return doc
  }
}

// 存储状态
interface StorageState {
  config: StorageConfig
  currentPath: string
  recentFiles: string[]
  
  // 配置操作
  setConfig: (config: Partial<StorageConfig>) => void
  
  // 文件操作
  saveDocument: (doc: MindNestDocument, format?: StorageFormat) => Promise<string>
  loadDocument: (path: string) => Promise<MindNestDocument>
  deleteDocument: (path: string) => Promise<void>
  
  // 格式转换
  exportDocument: (doc: MindNestDocument, options: ExportOptions) => Promise<string>
  importDocuments: (files: File[]) => Promise<ImportResult>
  
  // 路径管理
  setCurrentPath: (path: string) => void
  addRecentFile: (path: string) => void
}

export const useStorageStore = create<StorageState>()(
  persist(
    (set, get) => ({
      config: {
        basePath: '',
        defaultFormat: 'hybrid',
        autoSave: true,
        autoSaveInterval: 30000,
        backupEnabled: true,
        backupInterval: 300000
      },
      currentPath: '',
      recentFiles: [],

      setConfig: (config) => set(state => ({ 
        config: { ...state.config, ...config } 
      })),

      saveDocument: async (doc, format) => {
        const ext = format === 'markdown' ? '.md' : format === 'mindnest' ? '.mn' : '.md'
        const filename = `${doc.metadata.title || 'untitled'}${ext}`
        
        let content: string
        switch (format || get().config.defaultFormat) {
          case 'markdown':
            content = serializeDocument.toMarkdown(doc)
            break
          case 'mindnest':
            content = serializeDocument.toMindNest(doc)
            break
          case 'hybrid':
          default:
            content = serializeDocument.toHybrid(doc)
        }
        
        // TODO: 调用 Tauri API 保存文件
        console.log('Saving to:', filename, content)
        return filename
      },

      loadDocument: async (path) => {
        // TODO: 调用 Tauri API 读取文件
        const mockContent = '# Test\n\nThis is a test document.'
        return deserializeDocument.fromMarkdown(mockContent, path)
      },

      deleteDocument: async (path) => {
        // TODO: 调用 Tauri API 删除文件
        console.log('Deleting:', path)
      },

      exportDocument: async (doc, options) => {
        let content: string
        switch (options.format) {
          case 'markdown':
            content = serializeDocument.toMarkdown(doc)
            break
          case 'json':
            content = JSON.stringify(doc, null, 2)
            break
          case 'html':
            // TODO: 实现 HTML 导出
            content = '<html>...</html>'
            break
          default:
            content = serializeDocument.toMarkdown(doc)
        }
        return content
      },

      importDocuments: async (files) => {
        const result: ImportResult = {
          success: true,
          imported: 0,
          failed: 0,
          errors: []
        }
        
        for (const file of files) {
          try {
            const content = await file.text()
            // 根据扩展名判断格式
            if (file.name.endsWith('.md')) {
              deserializeDocument.fromMarkdown(content, file.name)
            } else if (file.name.endsWith('.mn')) {
              deserializeDocument.fromMindNest(content)
            }
            result.imported++
          } catch (e) {
            result.failed++
            result.errors.push(`Failed to import ${file.name}: ${e}`)
          }
        }
        
        return result
      },

      setCurrentPath: (path) => set({ currentPath: path }),
      
      addRecentFile: (path) => set(state => ({
        recentFiles: [path, ...state.recentFiles.filter(p => p !== path)].slice(0, 20)
      }))
    }),
    {
      name: 'storage-config',
      partialize: (state) => ({ config: state.config, recentFiles: state.recentFiles })
    }
  )
)
