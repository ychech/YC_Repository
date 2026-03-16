import { useState, useRef } from 'react'
import type { NoteData } from '../../../types/document'
import { 
  Image as ImageIcon, 
  Hash, 
  Smile,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  MapPin,
  Send,
  Calendar
} from 'lucide-react'
import { cn } from '../../../utils/cn'

interface NoteEditorProps {
  data: NoteData
  onChange: (data: NoteData) => void
}

const moods = [
  { id: 'happy', emoji: '😊', label: '开心' },
  { id: 'calm', emoji: '😌', label: '平静' },
  { id: 'tired', emoji: '😴', label: '疲惫' },
  { id: 'excited', emoji: '🤩', label: '兴奋' },
  { id: 'sad', emoji: '😢', label: '低落' },
]

const weathers = [
  { id: 'sunny', icon: Sun, label: '晴天' },
  { id: 'cloudy', icon: Cloud, label: '多云' },
  { id: 'rainy', icon: CloudRain, label: '雨天' },
  { id: 'snowy', icon: Snowflake, label: '雪天' },
]

export function NoteEditor({ data, onChange }: NoteEditorProps) {
  const [content, setContent] = useState(data.content || '')
  const [selectedMood, setSelectedMood] = useState(data.mood)
  const [selectedWeather, setSelectedWeather] = useState(data.weather)
  const [tags, setTags] = useState<string[]>(data.tags || [])
  const [newTag, setNewTag] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const updateData = (updates: Partial<NoteData>) => {
    onChange({ ...data, ...updates })
  }

  const handleContentChange = (value: string) => {
    setContent(value)
    updateData({ content: value })
  }

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood as any)
    updateData({ mood: mood as any })
  }

  const handleWeatherSelect = (weather: string) => {
    setSelectedWeather(weather as any)
    updateData({ weather: weather as any })
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()]
      setTags(updatedTags)
      updateData({ tags: updatedTags })
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    const updatedTags = tags.filter(t => t !== tag)
    setTags(updatedTags)
    updateData({ tags: updatedTags })
  }

  const now = new Date()
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      {/* 顶部时间栏 */}
      <div className="px-6 py-4 border-b border-border/50">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-light">{timeStr}</span>
          <span className="text-muted-foreground">{dateStr}</span>
        </div>
      </div>

      {/* 编辑器主体 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* 心情选择 */}
          <div className="mb-6">
            <label className="text-sm text-muted-foreground mb-3 block">此刻心情</label>
            <div className="flex gap-2">
              {moods.map(mood => (
                <button
                  key={mood.id}
                  onClick={() => handleMoodSelect(mood.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-xl transition-all",
                    selectedMood === mood.id
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="text-2xl">{mood.emoji}</span>
                  <span className="text-xs text-muted-foreground">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 天气选择 */}
          <div className="mb-6">
            <label className="text-sm text-muted-foreground mb-3 block">天气</label>
            <div className="flex gap-2">
              {weathers.map(weather => {
                const Icon = weather.icon
                return (
                  <button
                    key={weather.id}
                    onClick={() => handleWeatherSelect(weather.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                      selectedWeather === weather.id
                        ? "bg-primary/10 ring-2 ring-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{weather.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 正文输入 */}
          <div className="mb-6">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="记录此刻的想法..."
              className="w-full min-h-[200px] bg-transparent border-none outline-none text-lg leading-relaxed resize-none placeholder:text-muted-foreground/50"
              style={{ fieldSizing: 'content' }}
            />
          </div>

          {/* 标签 */}
          <div className="mb-6">
            <label className="text-sm text-muted-foreground mb-3 block flex items-center gap-2">
              <Hash className="w-4 h-4" />
              标签
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map(tag => (
                <span 
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                >
                  #{tag}
                  <button 
                    onClick={() => removeTag(tag)}
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                placeholder="添加标签，按回车确认"
                className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button 
                onClick={addTag}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
              >
                添加
              </button>
            </div>
          </div>

          {/* 图片预览区域 */}
          {data.images && data.images.length > 0 && (
            <div className="mb-6">
              <label className="text-sm text-muted-foreground mb-3 block">图片</label>
              <div className="grid grid-cols-3 gap-3">
                {data.images.map((img, index) => (
                  <div key={index} className="aspect-square rounded-lg bg-muted overflow-hidden">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 位置 */}
          <div className="mb-6">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <MapPin className="w-4 h-4" />
              {data.location || '添加位置'}
            </button>
          </div>
        </div>
      </div>

      {/* 底部工具栏 */}
      <div className="px-6 py-4 border-t border-border bg-card/50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
              <ImageIcon className="w-5 h-5" />
            </button>
            <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
              <Smile className="w-5 h-5" />
            </button>
            <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
              <Calendar className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{content.length} 字</span>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <Send className="w-4 h-4" />
              发布
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
