import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as tauri from '../hooks/useTauri'

// 设置类型定义
export interface GeneralSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  startupBehavior: 'continue' | 'new' | 'blank'
  autoSaveInterval: number
  showLineNumbers: boolean
  fontSize: number
  fontFamily: string
}

export interface EditorSettings {
  wordWrap: 'soft' | 'hard'
  tabSize: number
  useSpacesForTabs: boolean
  showWhitespace: boolean
  spellCheck: boolean
  autoBrackets: boolean
  autoQuotes: boolean
  autoFormatPaste: boolean
}

export interface AISettings {
  enabled: boolean
  localModelPath: string | null
  preferredModel: string
  apiProvider: 'local' | 'openai' | 'anthropic' | 'custom'
  apiKey: string | null
  apiBaseUrl: string | null
  defaultTemperature: number
  maxTokens: number
  suggestionInterval: number
  autoCompletion: boolean
  smartTags: boolean
  translateTargetLanguage: string
}

export interface ShortcutSettings {
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

export interface PrivacySettings {
  enableTelemetry: boolean
  autoCheckUpdates: boolean
  crashReporting: boolean
  e2eeSync: boolean
  syncProvider: string | null
}

export interface AppSettings {
  general: GeneralSettings
  editor: EditorSettings
  ai: AISettings
  shortcuts: ShortcutSettings
  privacy: PrivacySettings
}

// 默认设置
export const defaultSettings: AppSettings = {
  general: {
    theme: 'system',
    language: 'zh-CN',
    startupBehavior: 'continue',
    autoSaveInterval: 30,
    showLineNumbers: false,
    fontSize: 16,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  editor: {
    wordWrap: 'soft',
    tabSize: 2,
    useSpacesForTabs: true,
    showWhitespace: false,
    spellCheck: true,
    autoBrackets: true,
    autoQuotes: true,
    autoFormatPaste: true,
  },
  ai: {
    enabled: true,
    localModelPath: null,
    preferredModel: 'gpt-4o-mini',
    apiProvider: 'openai',
    apiKey: null,
    apiBaseUrl: null,
    defaultTemperature: 0.7,
    maxTokens: 2000,
    suggestionInterval: 100,
    autoCompletion: true,
    smartTags: true,
    translateTargetLanguage: 'zh',
  },
  shortcuts: {
    save: 'mod+s',
    newDocument: 'mod+n',
    search: 'mod+k',
    commandPalette: 'mod+shift+p',
    toggleSidebar: 'mod+\\',
    togglePreview: 'mod+e',
    bold: 'mod+b',
    italic: 'mod+i',
    code: 'mod+shift+c',
    link: 'mod+k',
  },
  privacy: {
    enableTelemetry: false,
    autoCheckUpdates: true,
    crashReporting: true,
    e2eeSync: false,
    syncProvider: null,
  },
}

// 主题选项
export const themeOptions = [
  { value: 'light', label: '浅色', icon: '☀️' },
  { value: 'dark', label: '深色', icon: '🌙' },
  { value: 'system', label: '跟随系统', icon: '💻' },
] as const

// 语言选项
export const languageOptions = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁体中文' },
  { value: 'en-US', label: 'English' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'ko-KR', label: '한국어' },
]

// AI 提供商选项
export const aiProviderOptions = [
  { value: 'local', label: '本地模型', description: '使用本地部署的 AI 模型' },
  { value: 'openai', label: 'OpenAI', description: 'GPT-4 / GPT-4o / GPT-3.5' },
  { value: 'anthropic', label: 'Anthropic', description: 'Claude 3 系列' },
  { value: 'custom', label: '自定义', description: '兼容 OpenAI API 的自定义端点' },
]

interface SettingsState {
  settings: AppSettings
  isLoading: boolean
  isDirty: boolean
  error: string | null
  
  // Actions
  loadSettings: () => Promise<void>
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>
  updateGeneral: (updates: Partial<GeneralSettings>) => Promise<void>
  updateEditor: (updates: Partial<EditorSettings>) => Promise<void>
  updateAI: (updates: Partial<AISettings>) => Promise<void>
  updateShortcuts: (updates: Partial<ShortcutSettings>) => Promise<void>
  updatePrivacy: (updates: Partial<PrivacySettings>) => Promise<void>
  resetSettings: () => Promise<void>
  exportSettings: () => Promise<string>
  importSettings: (json: string) => Promise<void>
  applyTheme: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      isLoading: false,
      isDirty: false,
      error: null,
      
      loadSettings: async () => {
        set({ isLoading: true, error: null })
        try {
          const backendSettings = await tauri.getSettings() as AppSettings
          set({ 
            settings: { ...defaultSettings, ...backendSettings },
            isLoading: false,
            isDirty: false,
          })
          get().applyTheme()
        } catch (error) {
          console.error('Failed to load settings:', error)
          set({ isLoading: false, error: String(error) })
          // 使用本地默认设置
          get().applyTheme()
        }
      },
      
      updateSettings: async (updates) => {
        const newSettings = { ...get().settings, ...updates }
        set({ settings: newSettings as AppSettings, isDirty: true })
        
        try {
          await tauri.updateSettings(newSettings as tauri.Settings)
          set({ isDirty: false })
          get().applyTheme()
        } catch (error) {
          set({ error: String(error) })
        }
      },
      
      updateGeneral: async (updates) => {
        await get().updateSettings({ general: { ...get().settings.general, ...updates } })
      },
      
      updateEditor: async (updates) => {
        await get().updateSettings({ editor: { ...get().settings.editor, ...updates } })
      },
      
      updateAI: async (updates) => {
        await get().updateSettings({ ai: { ...get().settings.ai, ...updates } })
      },
      
      updateShortcuts: async (updates) => {
        await get().updateSettings({ shortcuts: { ...get().settings.shortcuts, ...updates } })
      },
      
      updatePrivacy: async (updates) => {
        await get().updateSettings({ privacy: { ...get().settings.privacy, ...updates } })
      },
      
      resetSettings: async () => {
        set({ isLoading: true })
        try {
          await tauri.resetSettings()
          set({ 
            settings: defaultSettings,
            isLoading: false,
            isDirty: false,
          })
          get().applyTheme()
        } catch (error) {
          set({ error: String(error), isLoading: false })
        }
      },
      
      exportSettings: async () => {
        try {
          return await tauri.exportSettings()
        } catch (error) {
          // 如果后端失败，导出本地设置
          return JSON.stringify(get().settings, null, 2)
        }
      },
      
      importSettings: async (json) => {
        set({ isLoading: true })
        try {
          await tauri.importSettings(json)
          await get().loadSettings()
        } catch (error) {
          // 尝试本地解析
          try {
            const parsed = JSON.parse(json)
            set({ 
              settings: { ...defaultSettings, ...parsed },
              isLoading: false,
              isDirty: false,
            })
            get().applyTheme()
          } catch {
            set({ error: 'Invalid settings JSON', isLoading: false })
          }
        }
      },
      
      applyTheme: () => {
        const { theme } = get().settings.general
        const root = document.documentElement
        
        root.classList.remove('light', 'dark')
        
        if (theme === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.classList.add(prefersDark ? 'dark' : 'light')
        } else {
          root.classList.add(theme)
        }
        
        // 监听系统主题变化
        if (theme === 'system') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
          const handler = (e: MediaQueryListEvent) => {
            root.classList.remove('light', 'dark')
            root.classList.add(e.matches ? 'dark' : 'light')
          }
          mediaQuery.addEventListener('change', handler)
        }
      },
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
)

// 快捷键格式化显示
export function formatShortcut(shortcut: string): string {
  return shortcut
    .replace('mod', '⌘')
    .replace('shift', '⇧')
    .replace('alt', '⌥')
    .replace('ctrl', '⌃')
    .replace('+', ' ')
}

// 字体大小选项
export const fontSizeOptions = [12, 14, 16, 18, 20, 22, 24]

// 自动保存间隔选项
export const autoSaveOptions = [
  { value: 0, label: '禁用' },
  { value: 10, label: '10 秒' },
  { value: 30, label: '30 秒' },
  { value: 60, label: '1 分钟' },
  { value: 300, label: '5 分钟' },
]
