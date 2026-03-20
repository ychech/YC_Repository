# AI 间协作文档 - MindNest 项目

> 创建者: AI Assistant  
> 时间: 2026-03-18  
> 状态: 开发中，关键功能待修复

---

## 📋 项目概览

**MindNest** - AI原生的本地优先知识管理系统
- 技术栈: Tauri v2 (Rust) + React + TypeScript + Tailwind
- 数据库: SQLite + Tantivy 搜索引擎
- 当前阶段: MVP 开发，核心功能调试

---

## 🔥 当前阻塞问题（P0）

### 问题1: 拖拽排序完全失效

**现象:**
- 拖拽文档时没有白色指示线
- 松开后文档不移动
- 控制台没有 `[DragStart]` 等日志输出

**已尝试的修复:**
1. ✅ 使用模块级全局状态 `dragState`（绕过 HTML5 drag API 限制）
2. ✅ 添加了详细的 `console.log` 调试
3. ✅ 指示线颜色改为白色 + 阴影

**代码位置:**
- `src/components/DraggableDocList.tsx` - 主要实现
- `src/components/Sidebar.tsx` - 调用方

**关键代码:**
```typescript
// DraggableDocList.tsx
export const dragState = {
  docId: null as string | null,
  sourceFolderId: null as string | null,
  isDragging: false
}

const handleDragStart = (e: React.DragEvent, docId: string) => {
  console.log('[DragStart]', docId)  // 应该有日志输出
  dragState.docId = docId
  dragState.isDragging = true
  // ...
}
```

**可能原因:**
- React 事件绑定问题？
- `draggable` 属性未正确设置？
- 事件冒泡被阻止？

**调试方法:**
1. 打开浏览器控制台 (F12)
2. 尝试拖拽文档
3. 检查是否有 `[DragStart]` `[DragOver]` `[Drop]` 日志

---

### 问题2: 画板切换后变成文档

**现象:**
- 创建画板后正常显示
- 切换到其他文档后再切换回来，画板变成了 Markdown 编辑器
- 或者画板内容显示为空白

**已尝试的修复:**
1. ✅ Whiteboard 组件添加 `useEffect` 监听 `initialData` 变化
2. ✅ EditorPage 使用 `${docId}-${type}` 作为 key 强制重新渲染
3. ✅ 统一了 `WhiteboardData` 类型定义

**代码位置:**
- `src/components/whiteboard/Whiteboard.tsx` - 画板组件
- `src/pages/EditorPage.tsx` - 编辑器路由

**关键代码:**
```typescript
// Whiteboard.tsx
useEffect(() => {
  if (initialData) {
    setElements(initialData.elements || [])
    // ...
  }
}, [initialData])

// EditorPage.tsx
const editorKey = `${docId}-${currentDocument.type}`
<Whiteboard key={editorKey} initialData={wbData} ... />
```

**类型定义:**
- `types/document.ts` - 统一定义 `WhiteboardData`
- `components/whiteboard/types.ts` - 引用外部定义

**可能原因:**
- 类型仍然冲突？
- 数据解析失败回退到默认空数据？
- React key 策略不正确？

---

## ✅ 已完成的修复

### 1. 颜色主题统一
- 所有蓝色按钮改为灰色 (`bg-gray-700`)
- 指示线改为白色 (`bg-white`)

### 2. 类型系统修复
- 统一 `WhiteboardData` 定义
- 添加 `position` 字段到 `Folder` 接口
- 修复 `GraphData` 与 `WhiteboardData` 冲突

### 3. 代码结构优化
- 创建 `DraggableDocList` 独立组件
- 添加完整的调试日志

---

## 📁 关键文件清单

| 文件 | 作用 | 状态 |
|-----|------|------|
| `src/components/DraggableDocList.tsx` | 拖拽排序组件 | 待调试 |
| `src/components/whiteboard/Whiteboard.tsx` | 画板编辑器 | 待验证 |
| `src/pages/EditorPage.tsx` | 文档编辑器页面 | 待验证 |
| `src/stores/document.ts` | 文档状态管理 | 已修复 |
| `src/types/document.ts` | 类型定义 | 已修复 |
| `src/components/Sidebar.tsx` | 侧边栏 | 已更新 |

---

## 🧪 测试方法

### 测试拖拽功能
```
1. 启动应用: npm run tauri dev
2. 打开浏览器控制台 (F12)
3. 创建 3 个文档
4. 尝试拖拽排序
5. 预期输出: [DragStart] [DragOver] [Drop] 日志
```

### 测试画板切换
```
1. 创建画板文档
2. 创建 Markdown 文档
3. 来回切换
4. 预期: 画板始终显示画布界面
5. 控制台输出: [EditorPage] Rendering Whiteboard
```

---

## 💡 技术要点

### HTML5 Drag & Drop API 限制
```typescript
// ❌ 错误：在 dragover 中读取 dataTransfer
dataTransfer.getData('xxx') // 永远返回空！

// ✅ 正确：使用模块级全局状态
const dragState = { docId: null }
function handleDragStart(docId) {
  dragState.docId = docId  // 设置
}
function handleDrop() {
  const id = dragState.docId  // 读取
}
```

### React 组件重新渲染
```typescript
// ❌ 错误：只使用 docId 作为 key
<Component key={docId} />

// ✅ 正确：使用组合 key
<Component key={`${docId}-${type}`} />
```

---

## 📝 下一步任务

### 高优先级（P0）
1. **修复拖拽功能**
   - 诊断为什么日志不输出
   - 检查事件绑定是否正确
   - 验证全局状态是否工作

2. **修复画板切换**
   - 验证类型定义是否正确导入
   - 检查 useEffect 是否触发
   - 测试 key 策略是否生效

### 中优先级（P1）
3. 完善文档创建流程
4. 优化首次加载性能
5. 添加错误边界处理

---

## 🔗 相关文档

- `docs/1_STYLE_GUIDE.md` - 代码风格指南
- `docs/2_DONT_DO.md` - 常见错误与禁忌
- `docs/3_CORE_TASKS.md` - 核心任务列表
- `docs/4_DESIGN_GOALS.md` - 设计目标

---

## 💬 给接手AI的留言

**AI2/AI3/AI4/AI5:**

当前最关键的问题是**拖拽功能完全失效**，其次是**画板切换后类型混乱**。

我已经做了大量基础工作：
1. 类型系统统一
2. 颜色主题统一
3. 代码结构重构
4. 详细的调试日志

但核心功能仍有问题，需要深入调试：
- **拖拽**：检查浏览器控制台的日志输出，确认事件是否触发
- **画板**：验证类型定义和数据流是否正确

建议从控制台日志入手，追踪数据流向。

有问题请查看：
- `src/components/DraggableDocList.tsx` 的调试日志
- `src/pages/EditorPage.tsx` 的类型切换逻辑

---

## 📞 联系方式

项目路径: `/Users/yc/IdeaProjects/pytest/yuque/mindnest`

启动命令:
```bash
cd /Users/yc/IdeaProjects/pytest/yuque/mindnest
npm run tauri dev
```

---

**最后更新: 2026-03-18**
