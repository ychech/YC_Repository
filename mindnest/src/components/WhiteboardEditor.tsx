/**
 * 画板编辑器页面
 * 用于编辑 whiteboard 类型的文档
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Save, Share2, MoreHorizontal } from 'lucide-react'
import { Whiteboard } from './whiteboard'
import type { WhiteboardData } from './whiteboard'
import { useDocumentStore } from '../stores/document'

export function WhiteboardEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { loadDocument, currentDocument, updateDocument } = useDocumentStore()
  
  const [data, setData] = useState<WhiteboardData>({
    elements: [],
    appState: {
      viewBackgroundColor: '#ffffff',
      zoom: 1,
    },
  })
  const [isLoading, setIsLoading] = useState(true)
  const [title, setTitle] = useState('无标题画板')

  // 加载文档
  useEffect(() => {
    if (id) {
      loadDocument(id).then(doc => {
        if (doc) {
          setTitle(doc.title)
          // 尝试解析 content 为 WhiteboardData
          try {
            if (doc.content) {
              const parsed = JSON.parse(doc.content)
              setData(parsed)
            }
          } catch (e) {
            console.warn('Failed to parse whiteboard data:', e)
          }
        }
        setIsLoading(false)
      })
    }
  }, [id, loadDocument])

  // 保存画板数据
  const handleSave = useCallback(async () => {
    if (!id) return
    
    const content = JSON.stringify(data)
    await updateDocument(id, { title, content })
  }, [id, title, data, updateDocument])

  // 自动保存
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSave()
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [data, handleSave])

  // 处理画板数据变化
  const handleChange = useCallback((newData: WhiteboardData) => {
    setData(newData)
  }, [])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* 顶部栏 */}
      <div className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 font-semibold text-lg bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
          placeholder="画板标题"
        />
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
          
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
            <Share2 className="w-5 h-5" />
          </button>
          
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 画板区域 */}
      <div className="flex-1 overflow-hidden">
        <Whiteboard
          initialData={data}
          onChange={handleChange}
        />
      </div>
    </div>
  )
}
