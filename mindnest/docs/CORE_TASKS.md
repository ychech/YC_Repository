# MindNest 核心任务事项

> 当前阶段: MVP 开发  
> 更新时间: 2026-03-16  
> 优先级: P0(紧急) > P1(重要) > P2(一般)

---

## 🔥 P0 - 紧急任务（本周内完成）

### 1. 拖拽排序系统完善 ✅ FIXED

**状态:** 2026-03-18 已修复

**问题根因:**
1. 使用 `dataTransfer.getData()` 在 `dragover` 中读取数据（永远返回空）
2. 尝试使用 `useState` 存储拖拽状态（事件处理函数是闭包，获取不到最新值）
3. 忘记调用 `e.preventDefault()` 导致 `drop` 事件不触发

**解决方案:**
```typescript
// 1. 必须使用模块级全局状态
const dragState = { docId: null as string | null }

// 2. dragstart 设置全局状态
dragState.docId = docId

// 3. dragover 检查全局状态（不能读 dataTransfer）
if (!dragState.docId) return

// 4. drop 读取全局状态并清空
const docId = dragState.docId
dragState.docId = null
```

**验收标准:**
```
✅ 文档可在同文件夹内拖拽排序
✅ 文档可拖拽到任意文件夹
✅ 拖拽时有清晰的白色指示线（bg-white + shadow）
✅ 空文件夹显示"拖拽到此处"占位
✅ 拖拽后位置正确保存到数据库
✅ 拖拽后界面即时更新
```

**相关文件:**
- `src/components/DraggableDocList.tsx`
- `src/components/Sidebar.tsx`
- `src/stores/document.ts`

---

### 2. 文档切换性能优化 ✅ FIXED

**状态:** 2026-03-18 已修复

**问题根因:**
1. `types/document.ts` 和 `components/whiteboard/types.ts` 中的 `WhiteboardData` 定义冲突
   - 前者是 `{ nodes, edges, viewport }`（图谱格式）
   - 后者是 `{ elements, appState }`（画板格式）
2. 类型冲突导致画布数据解析失败，回退到默认空数据
3. `Whiteboard` 组件没有监听 `initialData` 变化

**解决方案:**
```typescript
// 1. 统一类型定义（types/document.ts）
export interface WhiteboardData {
  elements: WhiteboardElement[]
  appState?: { viewBackgroundColor?: string; zoom?: number }
}

// 2. 画板组件监听 initialData 变化
useEffect(() => {
  if (initialData) {
    setElements(initialData.elements || [])
    // ...重置其他状态
  }
}, [initialData])

// 3. 使用 docId + type 作为 key 强制重新渲染
const editorKey = `${docId}-${currentDocument.type}`
<Whiteboard key={editorKey} ... />
```

**技术方案:**
```typescript
// EditorPage.tsx
// 1. 添加 key 强制重新渲染
<Whiteboard key={docId} initialData={data} />

// 2. 内容预加载
const { content } = useDocumentStore();
if (!content) return <Loading />;

// 3. 组件卸载清理
useEffect(() => {
  return () => {
    // 清理编辑器状态
  };
}, [docId]);
```

---

### 3. 颜色主题统一

**问题:**
- 多处仍有蓝色按钮/图标
- 用户要求黑灰主题

**需要修复的文件:**
```
优先级 文件 行号 修改
------  ---- ---- ----
P0  Sidebar.tsx 110 bg-blue-900/30 -> bg-gray-800
P0  Sidebar.tsx 131 text-blue-500 -> text-gray-400
P0  Sidebar.tsx 312 text-blue-400 -> text-gray-300
P0  EditorPage.tsx 29 typeColors.document 蓝->灰
P1  HomePage.tsx 多处 保留或改为灰色
P2  其他页面 视情况修改
```

---

## 🔴 P1 - 重要任务（本月内完成）

### 4. 文档类型系统完善

**问题:**
- [x] 后端已支持 contentType
- [x] 前端已传递类型参数
- [ ] 类型图标显示不一致
- [ ] 类型切换不支持（文档 -> 画布）

**验收标准:**
```
✅ 创建画布时正确保存为 canvas 类型
✅ 创建数据表时正确保存为 database 类型
✅ 文档列表中类型图标正确显示（emoji）
✅ 编辑器根据类型渲染对应组件
✅ 类型在数据库中正确存储
```

**数据模型:**
```typescript
// 前端类型
DocumentType = 'document' | 'spreadsheet' | 'whiteboard' | 'note'

// 后端类型  
ContentType = 'markdown' | 'database' | 'canvas'

// 映射关系
document -> markdown
spreadsheet -> database
whiteboard -> canvas
note -> markdown (特殊标记)
```

---

### 5. 文件存储系统

**现状:**
- 文档元数据存储在 SQLite
- 内容存储在独立文件

**待完成:**
```
✅ Markdown 文件读写 (.md)
✅ 画布数据读写 (.canvas)
⬜ 数据表文件格式 (.db)
⬜ 附件/图片存储
⬜ 文件变更监听（外部编辑同步）
⬜ 导入/导出功能
```

**文件结构:**
```
~/Library/Application Support/com.mindnest.app/
├── data/
│   ├── mindnest.db              # 元数据库
│   ├── documents/
│   │   ├── doc-xxx.md          # Markdown 文档
│   │   ├── doc-yyy.canvas      # 画布数据
│   │   └── doc-zzz.db          # 数据表
│   ├── attachments/             # 附件
│   │   ├── img-xxx.png
│   │   └── file-yyy.pdf
│   └── search_index/            # 搜索索引
└── config.json
```

---

### 6. 全文搜索系统

**现状:**
- Tantivy 搜索引擎已集成
- 基础索引结构已建立

**待完成:**
```
✅ 文档创建时自动索引
✅ 文档更新时重新索引
⬜ 搜索界面 UI
⬜ 搜索结果高亮
⬜ 搜索结果排序（相关性）
⬜ 搜索建议/自动补全
⬜ 高级搜索（按类型、日期、标签）
```

**界面设计:**
```
┌─────────────────────────────────────┐
│ 🔍 搜索文档...          [x] 清空   │
├─────────────────────────────────────┤
│ 最近搜索: 项目计划 会议纪要         │
├─────────────────────────────────────┤
│ 📄 项目计划.md                        │
│    ...搜索关键词高亮显示...          │
│    修改于 2 小时前                   │
├─────────────────────────────────────┤
│ 🎨 产品原型图                        │
│    ...搜索关键词高亮显示...          │
│    修改于 昨天                       │
└─────────────────────────────────────┘
```

---

## 🟡 P2 - 一般任务（后续规划）

### 7. AI 功能集成

**待完成:**
```
⬜ 本地 AI 模型集成 (llama.cpp)
⬜ 智能续写/润色
⬜ 文档摘要生成
⬜ 智能标签推荐
⬜ 相关知识推荐
⬜ 问答助手（基于知识库）
```

---

### 8. 知识图谱

**待完成:**
```
⬜ 双向链接解析 [[文档名]]
⬜ 链接关系可视化
⬜ 图谱探索界面
⬜ 孤立文档检测
⬜ 知识网络分析
```

---

### 9. 同步与备份

**待完成:**
```
⬜ 多端同步机制
⬜ 冲突解决策略
⬜ 端到端加密
⬜ 云存储集成 (iCloud/Dropbox)
⬜ 自动备份
```

---

### 10. 导入/导出

**待完成:**
```
⬜ 导入 Markdown 文件夹
⬜ 导入 Notion 导出文件
⬜ 导入 Obsidian Vault
⬜ 导出为 PDF
⬜ 导出为 HTML
⬜ 批量导出
```

---

## 📋 当前 Sprint（本周）

### 正在进行的任务

| 任务 | 负责人 | 进度 | 阻塞项 |
|-----|--------|-----|-------|
| 拖拽排序优化 | - | 80% | 位置计算精度 |
| 文档切换性能 | - | 70% | key 策略调整 |
| 颜色主题统一 | - | 60% | 多处残留蓝色 |
| 类型系统完善 | - | 90% | 图标显示 |

### 今日待办

- [ ] 修复 DraggableDocList 空文件夹拖拽
- [ ] 测试文档切换性能
- [ ] 统一 Sidebar 按钮颜色
- [ ] 验证画布类型创建流程

---

## 🎯 本周目标

**必须完成（P0）:**
1. 拖拽排序工作流畅
2. 文档切换不卡顿
3. 黑灰主题统一

**争取完成（P1）:**
1. 类型系统完善
2. 搜索界面基础版

---

## 📝 任务创建模板

```markdown
### 任务名

**优先级:** P0/P1/P2
**类型:** 功能/修复/优化
**相关模块:** Sidebar/Editor/Store

**描述:**
问题描述或功能需求

**验收标准:**
- [ ] 标准1
- [ ] 标准2

**技术方案:**
关键实现思路

**相关文件:**
- file-a.ts
- file-b.ts

**预计工时:** X 小时
**截止日期:** YYYY-MM-DD
```
问题描述或功能需求

**验收标准:**
- [ ] 标准1
- [ ] 标准2

**技术方案:**
关键实现思路

**相关文件:**
- file-a.ts
- file-b.ts

**预计工时:** X 小时
**截止日期:** YYYY-MM-DD
```

---

## 🎓 技术债务与教训

### 2026-03-18 重大修复记录

#### 1. 拖拽排序功能修复

**问题:** 拖拽完全没反应，指示线不显示

**根因:** 
- HTML5 Drag API 的安全限制：`dataTransfer.getData()` 在 `dragover` 事件中永远返回空
- 尝试使用 `useState` 存储拖拽状态，但事件处理器是闭包，获取不到最新值

**教训:**
```typescript
// ❌ 错误方案
const [dragId, setDragId] = useState<string | null>(null)
const handleDragOver = () => {
  console.log(dragId) // 永远是 null！
}

// ✅ 正确方案
let dragId: string | null = null  // 模块级变量
const handleDragOver = () => {
  console.log(dragId) // 能获取到最新值
}
```

**参考:** `docs/2_DONT_DO.md` - 拖拽实现禁忌

---

#### 2. 文档类型切换混乱

**问题:** 画布切换到 Markdown 时，界面还是显示画布

**根因:**
- `types/document.ts` 和 `components/whiteboard/types.ts` 都定义了 `WhiteboardData` 接口
- 一个是 `{ nodes, edges, viewport }`（图谱格式）
- 一个是 `{ elements, appState }`（画板格式）
- Store 和 Editor 使用了不同的定义，导致类型混乱

**教训:**
```typescript
// ❌ 错误：同名不同类型
// types/document.ts
export interface WhiteboardData { nodes: Node[] }

// components/whiteboard/types.ts
export interface WhiteboardData { elements: Element[] } // 冲突！

// ✅ 正确：唯一类型名
// types/document.ts
export interface WhiteboardData { elements: Element[] }
export interface GraphData { nodes: Node[] } // 图谱用不同名字
```

**修复:** 统一类型定义，画板使用 `WhiteboardData`，图谱使用 `GraphData`

---

#### 3. 组件状态不重置

**问题:** 切换文档时，编辑器状态（滚动位置、选中内容）没有重置

**根因:** React 复用了相同类型的组件实例，没有强制重新渲染

**教训:**
```typescript
// ❌ 错误：只使用 docId 作为 key
<Whiteboard key={docId} initialData={data} />

// 问题：从画布A切换到画布B时，key 都是 "doc-xxx"，组件不复位

// ✅ 正确：使用 docId + type 作为 key
<Whiteboard key={`${docId}-${type}`} initialData={data} />

// 或者更简单
<Whiteboard key={`${docId}-${Date.now()}`} ... /> // 强制每次重新渲染
```

**最佳实践:** 对于编辑器类组件，切换文档时应该完全重新渲染，保留状态交给组件内部处理

---

## 🔒 代码审查清单

提交代码前必须检查：

**类型系统:**
- [ ] 没有同名但不同结构的类型定义
- [ ] Store 和 UI 组件使用一致的数据结构

**拖拽功能:**
- [ ] 使用模块级全局状态（非 useState）
- [ ] dragover 中调用 e.preventDefault()
- [ ] drop 中调用 e.preventDefault() 和 e.stopPropagation()

**组件渲染:**
- [ ] 编辑器组件使用唯一 key 强制重新渲染
- [ ] key 应该包含文档ID和类型

**颜色主题:**
- [ ] 没有残留的蓝色/琥珀色类名
- [ ] 使用 `text-gray-xxx` 和 `bg-gray-xxx`
