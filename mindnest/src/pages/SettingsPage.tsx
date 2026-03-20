import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore, themeOptions, languageOptions, aiProviderOptions, fontSizeOptions, autoSaveOptions, formatShortcut } from '../stores/settings'
import { getAppInfo, openDataDirectory } from '../hooks/useTauri'
import { cn } from '../utils/cn'
import {
  Settings, Palette, Type, Bot, Keyboard, Shield, ChevronRight, Download, Upload, RotateCcw,
  Check, Moon, Sun, Monitor, Globe, Clock, Eye, Type as TypeIcon, Save, Sparkles, Lock, Bell,
  FileText, FolderOpen, ExternalLink, Trash2, AlertTriangle
} from 'lucide-react'

type SettingsTab = 'general' | 'editor' | 'ai' | 'shortcuts' | 'privacy'

const tabs: { id: SettingsTab; label: string; icon: any }[] = [
  { id: 'general', label: '通用', icon: Settings },
  { id: 'editor', label: '编辑器', icon: Type },
  { id: 'ai', label: 'AI', icon: Bot },
  { id: 'shortcuts', label: '快捷键', icon: Keyboard },
  { id: 'privacy', label: '隐私', icon: Shield },
]

// 通用设置面板
function GeneralPanel() {
  const { settings, updateGeneral } = useSettingsStore()
  const { general } = settings

  return (
    <div className="space-y-8">
      {/* 外观主题 */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-blue-500" />
          外观
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => updateGeneral({ theme: option.value as any })}
              className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                general.theme === option.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-border hover:border-blue-200 dark:hover:border-blue-800"
              )}
            >
              <span className="text-3xl">{option.icon}</span>
              <span className="font-medium text-sm">{option.label}</span>
              {general.theme === option.value && (
                <Check className="w-4 h-4 text-blue-500" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* 语言 */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-green-500" />
          语言
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {languageOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => updateGeneral({ language: option.value })}
              className={cn(
                "px-4 py-2.5 rounded-lg border text-left transition-all",
                general.language === option.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                  : "border-border hover:border-blue-200"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {/* 字体设置 */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TypeIcon className="w-5 h-5 text-purple-500" />
          字体
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
            <div>
              <div className="font-medium">字体大小</div>
              <div className="text-sm text-muted-foreground">编辑器中的字体大小</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateGeneral({ fontSize: Math.max(12, general.fontSize - 2) })}
                className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-accent"
              >
                -
              </button>
              <span className="w-12 text-center font-mono">{general.fontSize}px</span>
              <button
                onClick={() => updateGeneral({ fontSize: Math.min(24, general.fontSize + 2) })}
                className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-accent"
              >
                +
              </button>
            </div>
          </div>

          <label className="flex items-center justify-between p-4 bg-muted/50 rounded-xl cursor-pointer">
            <div>
              <div className="font-medium">显示行号</div>
              <div className="text-sm text-muted-foreground">在编辑器左侧显示行号</div>
            </div>
            <input
              type="checkbox"
              checked={general.showLineNumbers}
              onChange={(e) => updateGeneral({ showLineNumbers: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300"
            />
          </label>
        </div>
      </section>

      {/* 启动与保存 */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          启动与保存
        </h3>
        <div className="space-y-3">
          <div className="p-4 bg-muted/50 rounded-xl">
            <div className="font-medium mb-2">启动时行为</div>
            <select
              value={general.startupBehavior}
              onChange={(e) => updateGeneral({ startupBehavior: e.target.value as any })}
              className="w-full px-3 py-2 rounded-lg border bg-background"
            >
              <option value="continue">继续上次的会话</option>
              <option value="new">打开新文档</option>
              <option value="blank">空白页面</option>
            </select>
          </div>

          <div className="p-4 bg-muted/50 rounded-xl">
            <div className="font-medium mb-2">自动保存</div>
            <select
              value={autoSaveOptions.some(o => o.value === general.autoSaveInterval) ? general.autoSaveInterval : -1}
              onChange={(e) => {
                const value = Number(e.target.value)
                if (value >= 0) {
                  updateGeneral({ autoSaveInterval: value })
                }
              }}
              className="w-full px-3 py-2 rounded-lg border bg-background"
            >
              {autoSaveOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {/* 自定义输入 */}
            {!autoSaveOptions.some(o => o.value === general.autoSaveInterval) && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="3600"
                  value={general.autoSaveInterval}
                  onChange={(e) => updateGeneral({ autoSaveInterval: Math.max(1, Math.min(3600, Number(e.target.value))) })}
                  className="w-24 px-3 py-2 rounded-lg border bg-background text-center"
                  placeholder="秒"
                />
                <span className="text-sm text-muted-foreground">秒</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

// 编辑器设置面板
function EditorPanel() {
  const { settings, updateEditor } = useSettingsStore()
  const { editor } = settings

  const settingsList = [
    { key: 'useSpacesForTabs', label: '使用空格代替制表符', desc: '按 Tab 键时插入空格' },
    { key: 'showWhitespace', label: '显示空白字符', desc: '显示空格和制表符' },
    { key: 'spellCheck', label: '拼写检查', desc: '高亮拼写错误的单词' },
    { key: 'autoBrackets', label: '自动配对括号', desc: '输入 ( 时自动添加 )' },
    { key: 'autoQuotes', label: '自动配对引号', desc: '输入 " 时自动添加 "' },
    { key: 'autoFormatPaste', label: '粘贴时自动格式化', desc: '粘贴内容时自动格式化' },
  ] as const

  return (
    <div className="space-y-8">
      {/* 换行与缩进 */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          换行与缩进
        </h3>
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-xl">
            <div className="font-medium mb-2">换行模式</div>
            <div className="flex gap-2">
              {['soft', 'hard'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => updateEditor({ wordWrap: mode as any })}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg border transition-all",
                    editor.wordWrap === mode
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-border hover:border-blue-200"
                  )}
                >
                  {mode === 'soft' ? '软换行' : '硬换行'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-xl">
            <div className="font-medium mb-2">制表符宽度</div>
            <div className="flex gap-2">
              {[2, 4, 8].map((size) => (
                <button
                  key={size}
                  onClick={() => updateEditor({ tabSize: size })}
                  className={cn(
                    "w-16 py-2 rounded-lg border transition-all",
                    editor.tabSize === size
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-border hover:border-blue-200"
                  )}
                >
                  {size} 空格
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 编辑器行为 */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-500" />
          编辑器行为
        </h3>
        <div className="space-y-2">
          {settingsList.map(({ key, label, desc }) => (
            <label key={key} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl cursor-pointer">
              <div>
                <div className="font-medium">{label}</div>
                <div className="text-sm text-muted-foreground">{desc}</div>
              </div>
              <input
                type="checkbox"
                checked={editor[key]}
                onChange={(e) => updateEditor({ [key]: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300"
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}

// AI 设置面板
function AIPanel() {
  const { settings, updateAI } = useSettingsStore()
  const { ai } = settings
  const [showApiKey, setShowApiKey] = useState(false)

  return (
    <div className="space-y-8">
      {/* AI 开关 */}
      <section>
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI 功能</h3>
              <p className="text-sm text-muted-foreground">启用智能写作辅助和知识问答</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={ai.enabled}
              onChange={(e) => updateAI({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </section>

      {ai.enabled && (
        <>
          {/* AI 提供商 */}
          <section>
            <h3 className="text-lg font-semibold mb-4">AI 提供商</h3>
            <div className="space-y-3">
              {aiProviderOptions.map((provider) => (
                <button
                  key={provider.value}
                  onClick={() => updateAI({ apiProvider: provider.value as any })}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                    ai.apiProvider === provider.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-border hover:border-blue-200"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    ai.apiProvider === provider.value ? "bg-blue-500 text-white" : "bg-muted"
                  )}>
                    {provider.value === 'local' ? '🏠' : 
                     provider.value === 'openai' ? '🤖' :
                     provider.value === 'anthropic' ? '🧠' : '⚙️'}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{provider.label}</div>
                    <div className="text-sm text-muted-foreground">{provider.description}</div>
                  </div>
                  {ai.apiProvider === provider.value && <Check className="w-5 h-5 text-blue-500" />}
                </button>
              ))}
            </div>
          </section>

          {/* API 设置 */}
          {ai.apiProvider !== 'local' && (
            <section>
              <h3 className="text-lg font-semibold mb-4">API 设置</h3>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-xl">
                  <label className="block font-medium mb-2">API 密钥</label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={ai.apiKey || ''}
                      onChange={(e) => updateAI({ apiKey: e.target.value || null })}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 pr-20 rounded-lg border bg-background"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? '隐藏' : '显示'}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">密钥将安全地存储在本地</p>
                </div>

                {ai.apiProvider === 'custom' && (
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <label className="block font-medium mb-2">API 基础 URL</label>
                    <input
                      type="text"
                      value={ai.apiBaseUrl || ''}
                      onChange={(e) => updateAI({ apiBaseUrl: e.target.value || null })}
                      placeholder="https://api.example.com/v1"
                      className="w-full px-3 py-2 rounded-lg border bg-background"
                    />
                  </div>
                )}

                <div className="p-4 bg-muted/50 rounded-xl">
                  <label className="block font-medium mb-2">模型</label>
                  <input
                    type="text"
                    value={ai.preferredModel}
                    onChange={(e) => updateAI({ preferredModel: e.target.value })}
                    placeholder="gpt-4o-mini"
                    className="w-full px-3 py-2 rounded-lg border bg-background"
                  />
                </div>
              </div>
            </section>
          )}

          {/* AI 行为 */}
          <section>
            <h3 className="text-lg font-semibold mb-4">AI 行为</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 bg-muted/50 rounded-xl cursor-pointer">
                <div>
                  <div className="font-medium">自动补全</div>
                  <div className="text-sm text-muted-foreground">输入时自动提供补全建议</div>
                </div>
                <input
                  type="checkbox"
                  checked={ai.autoCompletion}
                  onChange={(e) => updateAI({ autoCompletion: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-muted/50 rounded-xl cursor-pointer">
                <div>
                  <div className="font-medium">智能标签</div>
                  <div className="text-sm text-muted-foreground">自动推荐文档标签</div>
                </div>
                <input
                  type="checkbox"
                  checked={ai.smartTags}
                  onChange={(e) => updateAI({ smartTags: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300"
                />
              </label>

              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Temperature</span>
                  <span className="text-sm text-muted-foreground">{ai.defaultTemperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={ai.defaultTemperature}
                  onChange={(e) => updateAI({ defaultTemperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>精确</span>
                  <span>平衡</span>
                  <span>创意</span>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl">
                <label className="block font-medium mb-2">最大 Tokens</label>
                <input
                  type="number"
                  value={ai.maxTokens}
                  onChange={(e) => updateAI({ maxTokens: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border bg-background"
                  min="100"
                  max="8000"
                  step="100"
                />
              </div>

              {/* 翻译目标语言 */}
              <div className="p-4 bg-muted/50 rounded-xl">
                <label className="block font-medium mb-2">翻译目标语言</label>
                <select
                  value={ai.translateTargetLanguage || 'zh'}
                  onChange={(e) => updateAI({ translateTargetLanguage: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border bg-background"
                >
                  <option value="zh">简体中文</option>
                  <option value="zh-TW">繁体中文</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="es">Español</option>
                  <option value="ru">Русский</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">AI 翻译功能将使用此语言作为目标语言</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

// 快捷键设置面板
function ShortcutsPanel() {
  const { settings, updateShortcuts } = useSettingsStore()
  const { shortcuts } = settings

  const shortcutList = [
    { key: 'save', label: '保存', defaultValue: 'mod+s' },
    { key: 'newDocument', label: '新建文档', defaultValue: 'mod+n' },
    { key: 'search', label: '搜索', defaultValue: 'mod+k' },
    { key: 'commandPalette', label: '命令面板', defaultValue: 'mod+shift+p' },
    { key: 'toggleSidebar', label: '切换侧边栏', defaultValue: 'mod+\\' },
    { key: 'togglePreview', label: '切换预览', defaultValue: 'mod+e' },
    { key: 'bold', label: '加粗', defaultValue: 'mod+b' },
    { key: 'italic', label: '斜体', defaultValue: 'mod+i' },
    { key: 'code', label: '代码', defaultValue: 'mod+shift+c' },
    { key: 'link', label: '插入链接', defaultValue: 'mod+k' },
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">键盘快捷键</h3>
        <button
          onClick={() => updateShortcuts({
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
          })}
          className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
        >
          <RotateCcw className="w-4 h-4" />
          重置为默认
        </button>
      </div>

      <div className="space-y-2">
        {shortcutList.map(({ key, label, defaultValue }) => (
          <div
            key={key}
            className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
          >
            <span className="font-medium">{label}</span>
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-1.5 bg-background rounded-lg border font-mono text-sm">
                {formatShortcut(shortcuts[key] || defaultValue)}
              </kbd>
              <button
                onClick={() => {
                  // 这里可以实现快捷键录制功能
                  alert('快捷键录制功能即将推出')
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                修改
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          快捷键录制功能将在后续版本中推出
        </p>
      </div>
    </div>
  )
}

// 隐私设置面板
function PrivacyPanel() {
  const { settings, updatePrivacy } = useSettingsStore()
  const { privacy } = settings
  const [dataDir, setDataDir] = useState<string>('')

  useEffect(() => {
    // 获取数据存储位置
    const getDataDir = async () => {
      try {
        const info = await getAppInfo() as { version: string; name: string; data_dir?: string }
        setDataDir(info.data_dir || '')
      } catch (e) {
        // 降级处理：显示常见路径
        const isMac = navigator.platform.toLowerCase().includes('mac')
        const isWin = navigator.platform.toLowerCase().includes('win')
        if (isMac) {
          setDataDir('~/Library/Application Support/MindNest/')
        } else if (isWin) {
          setDataDir('%APPDATA%\\MindNest\\')
        } else {
          setDataDir('~/.local/share/MindNest/')
        }
      }
    }
    getDataDir()
  }, [])

  return (
    <div className="space-y-8">
      {/* 数据与隐私 */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-red-500" />
          数据与隐私
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-4 bg-muted/50 rounded-xl cursor-pointer">
            <div>
              <div className="font-medium">遥测与分析</div>
              <div className="text-sm text-muted-foreground">发送匿名使用数据帮助改进产品</div>
            </div>
            <input
              type="checkbox"
              checked={privacy.enableTelemetry}
              onChange={(e) => updatePrivacy({ enableTelemetry: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-muted/50 rounded-xl cursor-pointer">
            <div>
              <div className="font-medium">自动检查更新</div>
              <div className="text-sm text-muted-foreground">启动时检查新版本</div>
            </div>
            <input
              type="checkbox"
              checked={privacy.autoCheckUpdates}
              onChange={(e) => updatePrivacy({ autoCheckUpdates: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-muted/50 rounded-xl cursor-pointer">
            <div>
              <div className="font-medium">崩溃报告</div>
              <div className="text-sm text-muted-foreground">发送错误报告帮助修复问题</div>
            </div>
            <input
              type="checkbox"
              checked={privacy.crashReporting}
              onChange={(e) => updatePrivacy({ crashReporting: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300"
            />
          </label>
        </div>
      </section>

      {/* 同步设置 */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-500" />
          同步
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-4 bg-muted/50 rounded-xl cursor-pointer">
            <div>
              <div className="font-medium">端到端加密同步</div>
              <div className="text-sm text-muted-foreground">使用加密同步保护数据安全</div>
            </div>
            <input
              type="checkbox"
              checked={privacy.e2eeSync}
              onChange={(e) => updatePrivacy({ e2eeSync: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300"
            />
          </label>
        </div>
      </section>

      {/* 数据管理 */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-orange-500" />
          数据管理
        </h3>
        
        {/* 存储位置 */}
        <div className="p-4 bg-muted/50 rounded-xl mb-3">
          <div className="font-medium mb-2">数据存储位置</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-background rounded-lg border text-sm font-mono text-muted-foreground truncate">
              {dataDir || '加载中...'}
            </code>
            <button
              onClick={async () => {
                try {
                  await openDataDirectory()
                } catch (e) {
                  // 降级处理：复制到剪贴板
                  navigator.clipboard.writeText(dataDir)
                  alert('路径已复制到剪贴板')
                }
              }}
              className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground"
              title="打开文件夹"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            您的文档、知识库和设置都存储在此位置。建议定期备份此文件夹。
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => alert('缓存清理功能即将推出')}
            className="w-full flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
          >
            <div className="text-left">
              <div className="font-medium">清理缓存</div>
              <div className="text-sm text-muted-foreground">释放磁盘空间</div>
            </div>
            <Trash2 className="w-5 h-5 text-muted-foreground" />
          </button>

          <button
            onClick={() => {
              if (confirm('确定要重置所有设置吗？此操作不可撤销。')) {
                useSettingsStore.getState().resetSettings()
              }
            }}
            className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-600"
          >
            <div className="text-left">
              <div className="font-medium">重置所有设置</div>
              <div className="text-sm text-red-500/80">恢复到默认状态</div>
            </div>
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  )
}

// 设置页面主组件
export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const { loadSettings, exportSettings, importSettings, isDirty } = useSettingsStore()

  useEffect(() => {
    loadSettings()
  }, [])

  const handleExport = async () => {
    const json = await exportSettings()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mindnest-settings-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const text = await file.text()
        await importSettings(text)
      }
    }
    input.click()
  }

  const panels: Record<SettingsTab, React.FC> = {
    general: GeneralPanel,
    editor: EditorPanel,
    ai: AIPanel,
    shortcuts: ShortcutsPanel,
    privacy: PrivacyPanel,
  }

  const ActivePanel = panels[activeTab]

  return (
    <div className="h-full flex bg-background">
      {/* 侧边栏 */}
      <aside className="w-64 border-r border-border bg-muted/30">
        <div className="p-6">
          <h1 className="text-xl font-bold mb-1">设置</h1>
          <p className="text-sm text-muted-foreground">自定义你的工作环境</p>
        </div>

        <nav className="px-3 pb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all mb-1",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
                {activeTab === tab.id && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </button>
            )
          })}
        </nav>

        <div className="px-6 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-3">设置管理</div>
          <div className="space-y-2">
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
            >
              <Download className="w-4 h-4" />
              导出设置
            </button>
            <button
              onClick={handleImport}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
            >
              <Upload className="w-4 h-4" />
              导入设置
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-8 px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ActivePanel />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 保存提示 */}
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 right-6 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            正在保存...
          </motion.div>
        )}
      </main>
    </div>
  )
}
