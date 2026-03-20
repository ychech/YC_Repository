# AI3: 拖拽功能重构记录

**日期**: 2026-03-18  
**作者**: AI3  
**关联文件**: 
- `src/components/DraggableDocList.tsx` (重写)
- `src/components/Sidebar.tsx` (重写)
- `src/components/dnd/DragContext.tsx` (未使用，保留参考)

---

## 1. 问题背景

用户反馈拖拽功能无法正常使用，具体问题：
1. 无法将文档拖拽到文件夹下
2. 无法在同一文件夹内调整文档顺序
3. 缺少拖拽时的视觉反馈（指示线）

---

## 2. 解决方案

### 2.1 技术选型

使用 **HTML5 Drag and Drop API**，原因：
- 原生支持，无需额外库
- 性能更好（对比 `DragContext.tsx` 的自定义鼠标事件方案）
- 与 React 配合简单
- 支持跨浏览器

### 2.2 核心实现

#### 全局拖拽状态 (Module-level State)
```typescript
// DraggableDocList.tsx - 全局状态，跨组件共享
export const dragState = {
  docId: null as string | null,
  sourceFolderId: null as string | null,
  isDragging: false
}
```

> ⚠️ **注意**: 必须使用模块级变量，不能放在组件内部。因为 HTML5 DnD API 在 `dragover` 事件中无法读取 `dataTransfer.getData()`。

#### 放置位置检测

**文档列表内排序** (`DraggableDocList.tsx`):
```typescript
// 根据鼠标Y坐标判断 before/after
const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
const mouseY = e.clientY
const itemMiddleY = rect.top + rect.height / 2
const position: 'before' | 'after' = mouseY < itemMiddleY ? 'before' : 'after'
```

**文件夹拖放** (`Sidebar.tsx` - FolderItem):
```typescript
// 根据鼠标在文件夹项上的位置判断放置区域
const calculateDropPosition = (e: React.DragEvent): FolderDropPosition => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const relativeY = e.clientY - rect.top
  const ratio = relativeY / rect.height
  
  if (ratio < 0.25) return 'before'      // 上25%: 放到文件夹前面
  if (ratio > 0.75) return 'after'       // 下25%: 放到文件夹后面
  return 'inside'                        // 中间50%: 放入文件夹
}
```

### 2.3 视觉反馈

| 场景 | 视觉反馈 |
|------|---------|
| 文档 before/after | 蓝色指示线 (`h-[2px] bg-blue-500`) |
| 文件夹 inside | 蓝色半透明背景 + 边框 (`bg-blue-500/20 ring-1 ring-blue-500`) |
| 空文件夹 | 虚线边框高亮 (`border-gray-500 bg-gray-800/50`) |

---

## 3. 文件修改详情

### 3.1 DraggableDocList.tsx (重写)

**功能**:
- 文档列表内拖拽排序
- 接受从其他文件夹拖入的文档
- 空文件夹作为放置区域
- before/after 指示线

**Props 接口**:
```typescript
interface DraggableDocListProps {
  docs: Doc[]                    // 文档列表
  folderId: string               // 当前文件夹ID
  level?: number                 // 缩进层级
  onDelete: (docId: string) => void
  onMove: (docId: string, targetFolderId: string, targetIndex: number) => void
  activeDocId?: string           // 当前激活的文档
}
```

**导出**:
```typescript
export { DraggableDocList, dragState }  // dragState 供 Sidebar 使用
```

### 3.2 Sidebar.tsx (重写)

**新增 FolderItem 功能**:
- 三种放置位置检测 (before/after/inside)
- 自动展开文件夹 (当文档放入时)
- 未分组区域拖放支持

**handleMoveDoc 算法** (位置计算):
```typescript
const handleMoveDoc = useCallback(async (docId: string, targetFolderId: string, targetIndex: number) => {
  // 1. 获取目标文件夹现有文档（排除正在拖拽的）
  const targetDocs = documents.filter(d => d.parentId === targetFolderId && d.id !== docId)
    .sort((a, b) => (a.position || 0) - (b.position || 0))
  
  // 2. 计算新 position
  let newPosition: number
  if (targetDocs.length === 0) {
    newPosition = 1000  // 空文件夹
  } else if (targetIndex <= 0) {
    newPosition = (targetDocs[0]?.position || 1000) - 1000  // 最前
  } else if (targetIndex >= targetDocs.length) {
    newPosition = (targetDocs[targetDocs.length - 1]?.position || 0) + 1000  // 最后
  } else {
    // 插入中间：取平均值
    newPosition = ((targetDocs[targetIndex - 1].position || 0) + (targetDocs[targetIndex].position || 0)) / 2
  }
  
  // 3. 调用后端 API
  await moveDocument(docId, currentKbId, undefined, targetFolderId || null, newPosition)
}, [])
```

---

## 4. 使用说明

### 4.1 用户操作流程

```
拖拽文档排序:
┌──────────────────────────────┐
│ 📄 文档 1                    │
│ ─────────────────────        │  ← 蓝色指示线 (before)
│ 📄 文档 2                    │
│ ─────────────────────        │  ← 蓝色指示线 (after)
│ 📄 文档 3                    │
└──────────────────────────────┘

拖拽到文件夹:
┌──────────────────────────────┐
│ 📁 文件夹 A                  │  ← 拖到上方: 放到A前面
│ ╔══════════════════════╗     │  ← 拖到中间: 放入A (蓝色高亮)
│ ║ 📄 文档 1            ║     │
│ ║ 📄 文档 2            ║     │
│ ╚══════════════════════╝     │
│ 📁 文件夹 B                  │  ← 拖到下方: 放到A后面
└──────────────────────────────┘
```

### 4.2 测试清单

- [ ] 同一文件夹内拖拽排序
- [ ] 跨文件夹拖拽文档
- [ ] 拖到空文件夹
- [ ] 从文件夹拖到未分组
- [ ] 大量文档时的性能

---

## 5. 已知问题

### 5.1 当前限制

1. **文件夹排序**: 当前只支持文档排序，文件夹本身不支持拖拽排序（预留了接口但未实现）
2. **跨知识库**: 不支持拖拽到不同知识库
3. **多层级展开**: 拖到深层文件夹时不会自动展开中间层级

### 5.2 潜在改进

```typescript
// TODO: 文件夹排序支持
const handleReorderFolder = (folderId: string, targetParentId: string | null, targetIndex: number) => {
  // 需要后端支持 folder position 字段
}

// TODO: 拖拽滚动
const handleAutoScroll = () => {
  // 拖拽到边缘时自动滚动容器
}
```

---

## 6. 关联后端 API

```typescript
// useTauri.ts
moveDocument(
  id: string, 
  parentId?: string | null, 
  folderId?: string | null, 
  position?: number
): Promise<Document>
```

**后端实现**: `src-tauri/src/commands/document.rs:164`
- 支持更新 `folder_id` (文件夹关联)
- 支持更新 `position` (排序位置)
- 使用 `move_document_to_folder` 数据库方法

---

## 7. 代码质量说明

### 7.1 已知代码问题（供 AI5 参考）

1. **any 类型**: `Sidebar.tsx` 中 `allFolders: any[]`, `docs: any[]` 需要定义具体类型
2. **硬编码值**: 
   - `position = 1000` 魔法数字
   - `setTimeout(..., 1500)` Toast 显示时间
3. **组件大小**: `Sidebar.tsx` 693行，包含多个子组件定义
4. **console.log**: 已清理调试代码

### 7.2 与 AI5 代码审查的关联

| AI5 提出的问题 | 本次修改状态 |
|---------------|-------------|
| 代码重复 (typeIcons) | ⚠️ 仍存在，跨文件重复 |
| useEffect 依赖项 | ⚠️ 仍存在 |
| any 类型 | ⚠️ Sidebar.tsx 中使用 |
| 调试代码 console.log | ✅ 已清理 |
| 组件文件过大 | ⚠️ Sidebar.tsx 仍较大 |

---

## 8. 给 AI2/AI4/AI5 的备注

### 如果你需要修改拖拽功能：

1. **修改排序逻辑**: 编辑 `Sidebar.tsx` 的 `handleMoveDoc` 函数
2. **修改视觉反馈**: 编辑对应组件的 className（使用 `cn()` 工具）
3. **添加文件夹排序**: 需要修改后端 `Folder` 模型添加 `position` 字段

### 如果你发现 bug：

- **拖拽不生效**: 检查 `dragState` 是否正确重置（dragend 时）
- **位置计算错误**: 检查 `targetIndex` 计算逻辑（同文件夹 vs 跨文件夹）
- **视觉反馈不消失**: 检查 `onDragLeave` 是否正确处理

### 文件关系图：

```
Sidebar.tsx
├── FolderItem (文件夹拖放 - before/after/inside)
│   └── DraggableDocList (文档列表排序)
└── DraggableDocList (未分组文档)

DragContext.tsx (未使用，参考用)
```

---

## 9. 变更日志

| 日期 | 修改人 | 内容 |
|-----|-------|------|
| 2026-03-18 | AI3 | 初始实现，重写 DraggableDocList.tsx 和 Sidebar.tsx |

---

*如有疑问，请查看源代码注释或联系 AI3*
