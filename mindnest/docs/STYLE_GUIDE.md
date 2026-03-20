# MindNest 规定风格文档

> 版本: v1.0  
> 适用范围: 所有前端、后端、设计相关代码

---

## 1. 视觉风格规范

### 1.1 颜色系统（黑灰主题）

```
主色调: 黑色/深灰系列
├── 背景色: bg-black / bg-gray-900
├── 卡片/面板: bg-gray-800 / bg-gray-850
├── 悬停状态: bg-gray-700 / hover:bg-gray-800
├── 选中状态: bg-gray-700 / ring-gray-600
└── 边框: border-gray-700 / border-gray-800

文字颜色:
├── 主要文字: text-white / text-gray-100
├── 次要文字: text-gray-300
├── 占位文字: text-gray-500 / text-gray-600
└── 禁用状态: text-gray-600

强调色（慎用）:
├── 成功: text-green-500 / bg-green-900/30
├── 警告: text-yellow-500 / bg-yellow-900/30
├── 错误: text-red-400 / hover:text-red-400
└── 拖拽指示: bg-white / shadow-white
```

**禁止使用的颜色:**
- ❌ `bg-blue-xxx`, `text-blue-xxx`, `border-blue-xxx` - 除非是系统级超链接
- ❌ `bg-amber-xxx`, `text-amber-xxx` - 黄色系禁用
- ❌ `bg-orange-xxx`, `text-orange-xxx` - 橙色系禁用
- ❌ 鲜艳渐变色（蓝到紫、彩虹等）

### 1.2 间距系统

```
基础单位: 4px (Tailwind 默认)

常用间距:
├── xs: 0.5 (2px) - 图标内边距
├── sm: 1-2 (4-8px) - 紧凑元素间距
├── md: 3-4 (12-16px) - 默认间距
├── lg: 6-8 (24-32px) - 区块间距
└── xl: 10-12 (40-48px) - 页面间距

组件间距:
├── 列表项: py-1.5 px-2
├── 按钮: py-2 px-3 (小) / py-2 px-4 (标准)
├── 卡片: p-4 / p-6
└── 页面边距: px-4 / px-6
```

### 1.3 圆角规范

```
├── 按钮/标签: rounded / rounded-lg (4-8px)
├── 输入框: rounded-lg (8px)
├── 卡片/面板: rounded-xl (12px) / rounded-2xl (16px)
├── 头像/图标: rounded-full
└── 拖拽指示线: rounded-full
```

---

## 2. 代码风格规范

### 2.1 前端 (React + TypeScript)

**文件组织:**
```
src/
├── components/          # 可复用组件
│   ├── DraggableDocList.tsx    # 大驼峰命名
│   └── ui/              # 基础UI组件
├── pages/               # 页面组件
│   ├── EditorPage.tsx
│   └── HomePage.tsx
├── hooks/               # 自定义 hooks
│   └── useTauri.ts
├── stores/              # 状态管理 (Zustand)
│   └── document.ts
├── types/               # 类型定义
│   └── document.ts
└── utils/               # 工具函数
    └── cn.ts
```

**命名规范:**
```typescript
// 组件: PascalCase
function DraggableDocList() {}

// Hooks: camelCase, 以 use 开头
function useDocumentStore() {}

// 类型: PascalCase
interface DocumentProps {}
type DocumentType = 'document' | 'whiteboard';

// 常量: UPPER_SNAKE_CASE (模块级)
const DEFAULT_KB_ID = 'default';

// 函数: camelCase
function handleMoveDoc() {}

// 布尔变量: 以 is/has/show 开头
const [isLoading, setIsLoading] = useState(false);
const [showMenu, setShowMenu] = useState(false);
```

**组件结构:**
```typescript
// 1. imports (按类型分组)
import { useState, useCallback } from 'react'  // React 内置
import { GripVertical } from 'lucide-react'    // 第三方库
import { cn } from '../utils/cn'               // 本地模块
import type { DocumentType } from './types'    // 类型

// 2. 类型定义
interface Props {
  docId: string;
  onMove: (id: string, target: string) => void;
}

// 3. 常量定义
const TYPE_ICONS: Record<string, string> = {
  document: '📄',
  whiteboard: '🎨',
};

// 4. 全局状态（必要时）
let dragState: { docId: string | null } = { docId: null };

// 5. 组件定义
export function ComponentName({ docId, onMove }: Props) {
  // 5.1 hooks
  const [isDragging, setIsDragging] = useState(false);
  
  // 5.2 派生状态
  const isActive = docId === currentId;
  
  // 5.3 回调函数
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);
  
  // 5.4 渲染
  return (
    <div className="...">
      {/* ... */}
    </div>
  );
}
```

**Tailwind 类名规范:**
```typescript
// 使用 cn() 合并类名
className={cn(
  "基础样式",
  "条件样式1",
  condition && "条件样式2",
  isActive ? "选中样式" : "未选中样式"
)}

// 样式顺序: 布局 -> 外观 -> 交互 -> 状态
className="
  flex items-center gap-2           /* 布局 */
  px-2 py-1.5 rounded-lg            /* 盒模型 */
  text-gray-300                     /* 文字 */
  hover:bg-gray-800                 /* 交互 */
  cursor-pointer select-none        /* 行为 */
"
```

### 2.2 后端 (Rust)

**模块组织:**
```
src-tauri/src/
├── main.rs              # 入口
├── commands/            # Tauri 命令
│   ├── document.rs
│   └── folder.rs
├── models/              # 数据模型
│   └── document.rs
├── db/                  # 数据库操作
│   └── mod.rs
└── error.rs             # 错误处理
```

**命名规范:**
```rust
// 结构体: PascalCase
pub struct Document {
    pub id: String,
    pub title: String,
}

// 函数: snake_case
pub async fn create_document() -> Result<Document> {}

// 常量: UPPER_SNAKE_CASE
const DEFAULT_POSITION: f64 = 0.0;

// 枚举: PascalCase, 变体 PascalCase
pub enum ContentType {
    Markdown,
    Canvas,
    Database,
}
```

---

## 3. 组件设计规范

### 3.1 组件拆分原则

**应该拆分的情况:**
- 代码超过 200 行
- 有独立的业务逻辑
- 需要在多处复用
- 有复杂的状态管理

**示例 - DraggableDocList:**
```typescript
// ✅ 独立组件 - 专注于文档拖拽列表
export function DraggableDocList({
  docs,
  folderId,
  onMove,
  onDelete,
}: Props) {
  // 独立的拖拽逻辑
  // 独立的渲染逻辑
}
```

### 3.2 Props 设计

```typescript
interface ComponentProps {
  // 必需参数放前面
  docId: string;
  docs: Doc[];
  
  // 回调函数
  onMove: (docId: string, targetFolderId: string, index: number) => void;
  onDelete: (docId: string) => void;
  
  // 可选参数
  level?: number;
  activeDocId?: string;
}
```

### 3.3 状态管理

**本地状态 (useState):**
- UI 临时状态（菜单显隐、拖拽状态）
- 表单临时值
- 动画状态

**全局状态 (Zustand):**
- 文档列表
- 当前用户
- 应用配置
- 跨组件共享的数据

---

## 4. 文件与存储规范

### 4.1 前端资源

```
public/
├── icons/               # 应用图标
├── fonts/               # 自定义字体
└── assets/              # 静态图片

src/
├── styles/
│   ├── globals.css      # 全局样式
│   └── theme.css        # 主题变量
```

### 4.2 后端存储

```
~/Library/Application Support/com.mindnest.app/
├── data/
│   ├── mindnest.db      # SQLite 数据库
│   ├── documents/       # Markdown 文件
│   └── search_index/    # Tantivy 索引
├── config.json          # 用户配置
└── cache/               # 临时缓存
```

---

## 5. 注释规范

### 5.1 文件头注释

```typescript
/**
 * 可拖拽文档列表组件
 * 支持文档拖拽排序、跨文件夹移动
 * 
 * @example
 * <DraggableDocList
 *   docs={docs}
 *   folderId="folder-1"
 *   onMove={handleMove}
 * />
 */
```

### 5.2 关键逻辑注释

```typescript
// 关键：添加 key={docId} 强制组件重新渲染
// 避免切换文档时状态混乱
const editorKey = docId || 'new';

// 全局拖拽状态（解决 HTML5 drag API 限制）
// dataTransfer 在 dragover 中无法读取，使用模块级变量绕过
let dragState = { docId: null as string | null };
```

---

## 6. 提交规范

```
<type>: <subject>

<body>

<footer>
```

**类型:**
- `feat`: 新功能
- `fix`: 修复
- `refactor`: 重构
- `style`: 样式调整
- `docs`: 文档
- `chore`: 杂项

**示例:**
```
feat: 添加文档拖拽排序功能

- 实现 DraggableDocList 组件
- 支持跨文件夹移动
- 添加白色拖拽指示线

Closes #123
```
