# 企业级拖拽系统 V2 设计文档

**版本**: 2.0  
**日期**: 2026-03-18  
**作者**: AI3 (综合 AI2/AI4/AI5 建议)  
**状态**: ✅ 已完成

---

## 1. 功能特性总览

### 1.1 文档拖拽
| 功能 | 状态 | 说明 |
|-----|------|------|
| 同文件夹排序 | ✅ | before/after 指示线 |
| 跨文件夹移动 | ✅ | 支持拖到任意文件夹 |
| 自动滚动 | ✅ | 拖拽到边缘自动滚动容器 |
| 空文件夹放置 | ✅ | 虚线边框 + 提示文字 |
| 键盘无障碍 | ⚠️ | 预留接口，待实现 |

### 1.2 文件夹拖拽
| 功能 | 状态 | 说明 |
|-----|------|------|
| 同层级排序 | ✅ | before/after/inside 三种位置 |
| 改变父级 | ✅ | 拖入另一个文件夹成为子文件夹 |
| 自动展开 | ✅ | 悬停 800ms 自动展开目标文件夹 |
| 防止循环 | ✅ | 不能拖入自己的子文件夹 |

---

## 2. 架构设计

### 2.1 拖拽状态管理

```typescript
// 文档拖拽状态 - 全局模块级变量
const dragState = {
  docId: string | null,
  sourceFolderId: string | null,
  isDragging: boolean
}

// 文件夹拖拽状态
const folderDragState = {
  folderId: string | null,
  sourceParentId: string | null,
  isDragging: boolean
}
```

> ⚠️ **为什么使用模块级变量？**
> HTML5 Drag API 在 `dragover` 事件中无法读取 `dataTransfer.getData()`，
> 必须使用全局状态传递拖拽数据。

### 2.2 放置位置检测

```
文档项检测：
┌─────────────────────┐
│     before (50%)    │  ← 鼠标在上半部分
├─────────────────────┤
│      文档内容        │
├─────────────────────┤
│     after (50%)     │  ← 鼠标在下半部分
└─────────────────────┘

文件夹项检测：
┌─────────────────────┐
│   before (25%)      │  ← 放到文件夹前面
├─────────────────────┤
│                     │
│   inside (50%)      │  ← 放入文件夹内部
│                     │
├─────────────────────┤
│   after (25%)       │  ← 放到文件夹后面
└─────────────────────┘
```

### 2.3 自动滚动算法

```typescript
function calculateAutoScrollSpeed(mouseY: number, containerRect: DOMRect): number {
  const threshold = 50  // 触发边界
  
  // 靠近顶部，向上滚动（负数）
  if (mouseY < containerRect.top + threshold) {
    return -speed * (1 - distanceRatio)
  }
  
  // 靠近底部，向下滚动（正数）
  if (mouseY > containerRect.bottom - threshold) {
    return speed * (1 - distanceRatio)
  }
  
  return 0
}
```

---

## 3. 文件结构

```
src/
├── components/
│   ├── DraggableDocList.tsx    # 文档拖拽组件
│   └── Sidebar.tsx              # 侧边栏（含文件夹拖拽）
├── constants/
│   ├── index.ts                 # 常量导出
│   ├── documentTypes.ts         # 文档类型常量
│   └── config.ts                # 应用配置常量
└── docs/
    └── AI3_DRAG_DROP_V2.md      # 本文档
```

---

## 4. 配置常量

### 4.1 拖拽配置 (DRAG_CONFIG)

```typescript
{
  // 位置计算
  POSITION_INCREMENT: 1000,     // 位置增量基数
  MIN_POSITION: -1000000,       // 最小位置值
  MAX_POSITION: 1000000,        // 最大位置值
  
  // 视觉反馈
  DROP_INDICATOR_HEIGHT: 2,     // 指示线高度（像素）
  DROP_INDICATOR_COLOR: 'bg-white',  // 白色指示线
  DROP_INDICATOR_SHADOW: 'shadow-[0_0_8px_rgba(255,255,255,0.8)]',
  DROP_HIGHLIGHT_BG: 'bg-white/10',
  FOLDER_DROP_HIGHLIGHT: 'bg-gray-800 ring-1 ring-gray-600',
  DRAGGING_OPACITY: 0.5,
  
  // 自动滚动
  AUTO_SCROLL_THRESHOLD: 50,    // 触发边界（像素）
  AUTO_SCROLL_SPEED: 8,         // 滚动速度
  
  // 文件夹放置阈值
  FOLDER_BEFORE_THRESHOLD: 0.25,  // 上方 25%
  FOLDER_AFTER_THRESHOLD: 0.75    // 下方 25%
}
```

### 4.2 文件夹拖拽配置

```typescript
{
  INDENT_BASE: 8,               // 缩进基础像素
  INDENT_PER_LEVEL: 12,         // 每级缩进增量
  EXPAND_ANIMATION_DURATION: 200,
  AUTO_EXPAND_DELAY: 800        // 自动展开延迟（毫秒）
}
```

---

## 5. 使用示例

### 5.1 基础用法

```tsx
import { DraggableDocList } from '@/components/DraggableDocList'

function MyComponent() {
  const handleMove = (docId, targetFolderId, targetIndex) => {
    // 执行移动逻辑
  }
  
  return (
    <DraggableDocList
      docs={documents}
      folderId="folder-1"
      onDelete={(id) => deleteDoc(id)}
      onMove={handleMove}
      enableAutoScroll
    />
  )
}
```

### 5.2 位置计算示例

```typescript
// 计算新位置的算法
function calculateNewPosition(targetDocs, targetIndex) {
  const INCREMENT = 1000
  
  if (targetDocs.length === 0) {
    return INCREMENT  // 空文件夹
  }
  
  if (targetIndex <= 0) {
    // 放到最前面
    return targetDocs[0].position - INCREMENT
  }
  
  if (targetIndex >= targetDocs.length) {
    // 放到最后面
    return targetDocs[targetDocs.length - 1].position + INCREMENT
  }
  
  // 插入中间：取平均值
  return (targetDocs[targetIndex - 1].position + targetDocs[targetIndex].position) / 2
}
```

---

## 6. 性能优化

### 6.1 渲染优化

| 优化点 | 实现方式 |
|-------|---------|
| 减少重渲染 | `setDropIndicator` 只在位置变化时更新 |
| 自动滚动 | `requestAnimationFrame` 实现平滑滚动 |
| 事件节流 | 拖拽事件自然节流（浏览器限制） |

### 6.2 状态管理

```typescript
// ❌ 避免：每次拖拽都创建新对象
setState({ ...state, dragging: true })

// ✅ 推荐：直接修改模块级变量
dragState.isDragging = true
```

---

## 7. 可访问性 (A11y)

### 7.1 已支持
- `role="button"` 和 `aria-label` 用于操作按钮
- 键盘焦点样式 (`focus:ring-1`)

### 7.2 待实现
- [ ] 键盘拖拽（Alt + 方向键）
- [ ] 屏幕阅读器通知
- [ ] ARIA live region 用于拖放反馈

---

## 8. 已知限制

| 限制 | 说明 | 解决方案 |
|-----|------|---------|
| 不能跨窗口拖拽 | 浏览器安全限制 | 使用原生 DnD API 暂无法实现 |
| 移动端不支持 | HTML5 DnD 不支持触摸 | 需额外实现触摸拖拽 |
| 大量数据性能 | 超过 1000 项可能卡顿 | 实现虚拟滚动 |

---

## 9. 改进建议

### 9.1 短期（本周）
- [ ] 添加撤销/重做支持（Ctrl+Z）
- [ ] 批量拖拽选择

### 9.2 中期（本月）
- [ ] 虚拟滚动支持（大量文档）
- [ ] 触摸设备支持

### 9.3 长期（下月）
- [ ] 跨窗口拖拽（使用 Electron API）
- [ ] 拖拽动画（Framer Motion）

---

## 10. 参考文档

- `docs/AI5_CODE_QUALITY_REVIEW.md` - 代码质量建议
- `docs/4_DESIGN_GOALS.md` - 设计目标
- `docs/3_CORE_TASKS.md` - 核心任务

---

*本文档由 AI3 编写，综合了 AI2、AI4、AI5 的建议*  
*最后更新: 2026-03-18*
