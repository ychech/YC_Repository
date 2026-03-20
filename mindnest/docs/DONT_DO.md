# MindNest 禁止事项

> ⚠️ 以下事项严格禁止，违反可能导致系统不稳定或代码质量下降

---

## 1. 视觉设计禁止

### ❌ 颜色使用禁忌

| 禁止项 | 示例 | 原因 | 替代方案 |
|-------|------|------|---------|
| 蓝色系主按钮 | `bg-blue-600` | 不符合黑灰主题 | `bg-gray-700` |
| 蓝色选中状态 | `bg-blue-900/30` | 不符合黑灰主题 | `bg-gray-800` |
| 蓝色图标 | `text-blue-500` | 不符合黑灰主题 | `text-gray-400` |
| 蓝色边框 | `border-blue-500` | 不符合黑灰主题 | `border-gray-600` |
| 黄色/琥珀色 | `bg-amber-50` | 禁用暖色调 | `bg-slate-50` |
| 橙色强调 | `text-orange-500` | 禁用暖色调 | `text-gray-500` |
| 鲜艳渐变 | `from-blue-500 to-purple-500` | 过于花哨 | 不使用渐变或灰色渐变 |

**例外情况:**
- ✅ 外部链接可以使用蓝色下划线
- ✅ 代码高亮中的语法着色
- ✅ 图表/数据可视化中的配色

### ❌ 视觉元素禁忌

```css
/* 禁止 - 发光阴影 */
shadow-[0_0_4px_rgba(59,130,246,0.8)]  /* 蓝色光晕 */
shadow-blue-500/20

/* 应该 - 简单阴影或无光晕 */
shadow-lg
shadow-sm

/* 禁止 - 蓝色拖拽指示线 */
bg-blue-500

/* 应该 - 白色/灰色指示线 */
bg-white
bg-gray-400
```

---

## 2. 代码编写禁止

### ❌ React 组件禁忌

```typescript
// ❌ 禁止：不使用 key 或 key 使用不当
<Editor doc={doc} />  // 切换文档时组件不复位

// ✅ 应该
<Editor key={docId} doc={doc} />

// ❌ 禁止：useEffect 依赖不全
useEffect(() => {
  loadDoc(docId);
}, []);  // 缺少 docId 依赖

// ✅ 应该
useEffect(() => {
  loadDoc(docId);
}, [docId]);

// ❌ 禁止：直接修改 props
function Component({ docs }) {
  docs.push(newDoc);  // 直接修改!
  return ...;
}

// ✅ 应该
function Component({ docs, onAdd }) {
  return (
    <button onClick={() => onAdd(newDoc)}>添加</button>
  );
}

// ❌ 禁止：useCallback 依赖导致循环
const handleMove = useCallback((id) => {
  move(id, docs);  // docs 变化导致 handleMove 变化
}, [docs, moveDocument, currentKbId, ...]);  // 过多依赖

// ✅ 应该：简化依赖或使用普通函数
const handleMove = (id: string) => {
  move(id);
};
```

### ❌ 状态管理禁忌

```typescript
// ❌ 禁止：在组件外直接修改全局状态
let globalState = { count: 0 };

function Component() {
  const handleClick = () => {
    globalState.count++;  // 直接修改！
  };
}

// ✅ 应该：使用状态管理库
import { useStore } from './store';

function Component() {
  const { count, increment } = useStore();
  const handleClick = () => increment();
}

// ❌ 禁止：混合多种状态管理方式
// 同一个状态同时在 useState、Zustand、Context 中管理

// ✅ 应该：统一使用一种方式
// UI 临时状态 -> useState
// 全局共享状态 -> Zustand
```

### ❌ 拖拽实现禁忌

**关键知识点：HTML5 Drag & Drop API 的安全限制**

```typescript
// ❌ 禁止：在 dragover 中读取 dataTransfer
dataTransfer.getData('xxx');  // 永远返回空字符串！

// ❌ 禁止：在组件内使用 useState 存储拖拽状态
const [dragId, setDragId] = useState<string | null>(null);
// 问题：事件处理函数是闭包，获取不到最新的 state 值

// ❌ 禁止：忘记阻止默认行为
function handleDragOver(e) {
  // 没有 e.preventDefault()，drop 事件不会触发！
}

// ❌ 禁止：使用 CSS 动画导致拖拽卡顿
transition: all 0.3s ease;  // 会严重影响拖拽流畅度
```

**✅ 正确的拖拽实现方案：**

```typescript
// ============================================================
// 1. 必须使用模块级全局状态（关键！）
// ============================================================
interface DragState {
  docId: string | null
  sourceFolderId: string | null
  isDragging: boolean
}

// 模块级变量，所有事件处理器都能访问
const dragState: DragState = {
  docId: null,
  sourceFolderId: null,
  isDragging: false
}

// ============================================================
// 2. 拖拽开始 - 记录被拖拽项
// ============================================================
function handleDragStart(e: React.DragEvent, docId: string, folderId: string) {
  // 设置全局状态
  dragState.docId = docId
  dragState.sourceFolderId = folderId
  dragState.isDragging = true
  
  // 设置拖拽效果（必须）
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', docId) // 虽然 dragover 读不到，但需要设置
  
  // 视觉反馈
  const el = e.currentTarget as HTMLElement
  el.style.opacity = '0.6'
}

// ============================================================
// 3. 拖拽经过 - 显示放置指示（不能读取 dataTransfer！）
// ============================================================
function handleDragOver(e: React.DragEvent, index: number) {
  // 必须阻止默认行为，否则 drop 不会触发
  e.preventDefault()
  
  // 只能检查全局状态，不能读 dataTransfer
  if (!dragState.isDragging) return
  
  // 计算放置位置（鼠标在元素上半部还是下半部）
  const rect = e.currentTarget.getBoundingClientRect()
  const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
  
  // 显示视觉指示线
  showDropIndicator(index, position)
  
  // 设置放置效果
  e.dataTransfer.dropEffect = 'move'
}

// ============================================================
// 4. 放置 - 执行移动操作
// ============================================================
function handleDrop(e: React.DragEvent, targetIndex: number) {
  e.preventDefault()
  e.stopPropagation() // 防止冒泡到父元素
  
  const { docId, sourceFolderId } = dragState
  if (!docId) return
  
  // 计算最终位置
  const rect = e.currentTarget.getBoundingClientRect()
  const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
  let finalIndex = position === 'before' ? targetIndex : targetIndex + 1
  
  // 同文件夹内移动需要调整索引
  if (sourceFolderId === targetFolderId) {
    const dragIndex = docs.findIndex(d => d.id === docId)
    if (dragIndex < finalIndex) finalIndex--
  }
  
  // 执行移动
  onMove(docId, targetFolderId, finalIndex)
  
  // 重置全局状态（必须！）
  dragState.docId = null
  dragState.sourceFolderId = null
  dragState.isDragging = false
}

// ============================================================
// 5. 拖拽结束 - 清理状态
// ============================================================
function handleDragEnd(e: React.DragEvent) {
  // 恢复视觉样式
  const el = e.currentTarget as HTMLElement
  el.style.opacity = ''
  
  // 重置状态
  dragState.docId = null
  dragState.sourceFolderId = null
  dragState.isDragging = false
}
```

**✅ 完整的可拖拽列表组件：**

参考实现：`src/components/DraggableDocList.tsx`

**✅ 关键检查清单：**

- [ ] 使用模块级全局状态（不能是组件内的 useState）
- [ ] dragover 中必须调用 e.preventDefault()
- [ ] drop 中必须调用 e.preventDefault() 和 e.stopPropagation()
- [ ] 拖拽结束后必须重置全局状态
- [ ] 放置指示线使用高对比度颜色（白色）
- [ ] 同文件夹内移动时调整索引避免位置错误
- [ ] 添加视觉反馈（半透明、缩放效果）

### ❌ Tailwind 使用禁忌

```html
<!-- ❌ 禁止：任意值滥用 -->
<div class="w-[123px] h-[45px] top-[13px]">

<!-- ✅ 应该：使用标准类 -->
<div class="w-32 h-12 top-3">

<!-- ❌ 禁止：类名顺序混乱 -->
<div class="hover:bg-gray-800 flex text-gray-300 rounded-lg px-2 cursor-pointer py-1.5">

<!-- ✅ 应该：按顺序排列 -->
<div class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-gray-300 hover:bg-gray-800 cursor-pointer">

<!-- ❌ 禁止：不使用 cn() 合并类名 -->
<div className={`base-class ${isActive ? 'active-class' : ''}`}>

<!-- ✅ 应该 -->
<div className={cn("base-class", isActive && "active-class")}>
```

---

## 3. 性能优化禁止

### ❌ 渲染性能禁忌

```typescript
// ❌ 禁止：在 render 中创建新对象/函数
function Component({ data }) {
  return (
    <List 
      items={data.map(d => ({ ...d, newProp: true }))}  // 每次渲染新对象
      onItemClick={(id) => handleClick(id)}  // 每次渲染新函数
    />
  );
}

// ✅ 应该：使用 useMemo / useCallback
function Component({ data }) {
  const processed = useMemo(() => 
    data.map(d => ({ ...d, newProp: true })),
    [data]
  );
  
  const handleItemClick = useCallback((id: string) => {
    handleClick(id);
  }, []);
  
  return <List items={processed} onItemClick={handleItemClick} />;
}

// ❌ 禁止：大型组件不拆分
function Sidebar() {
  // 500+ 行代码
  return ...;
}

// ✅ 应该：拆分成小组件
function Sidebar() {
  return (
    <div>
      <Header />
      <FolderList />
      <DocList />
      <Footer />
    </div>
  );
}
```

### ❌ 数据获取禁忌

```typescript
// ❌ 禁止：瀑布式请求
useEffect(() => {
  async function load() {
    const user = await fetchUser();        // 请求 1
    const docs = await fetchDocs(user.id); // 请求 2（等待 1）
    const tags = await fetchTags(user.id); // 请求 3（等待 2）
  }
  load();
}, []);

// ✅ 应该：并行请求
useEffect(() => {
  async function load() {
    const user = await fetchUser();
    const [docs, tags] = await Promise.all([
      fetchDocs(user.id),
      fetchTags(user.id)
    ]);
  }
  load();
}, []);

// ❌ 禁止：无防抖的频繁请求
<input onChange={(e) => search(e.target.value)} />

// ✅ 应该：使用防抖
import { debounce } from 'lodash';

const debouncedSearch = useMemo(
  () => debounce((value) => search(value), 300),
  []
);
```

---

## 4. 数据库与存储禁止

### ❌ SQL 禁忌

```rust
// ❌ 禁止：字符串拼接 SQL（SQL 注入风险）
let sql = format!("SELECT * FROM docs WHERE id = '{}'", doc_id);

// ✅ 应该：使用参数化查询
let sql = "SELECT * FROM docs WHERE id = ?1";
conn.execute(sql, [doc_id])?;

// ❌ 禁止：SELECT *
SELECT * FROM documents WHERE status = 'active';

// ✅ 应该：明确指定字段
SELECT id, title, content_type, updated_at FROM documents WHERE status = 'active';

// ❌ 禁止：不带 WHERE 的 UPDATE/DELETE
UPDATE documents SET status = 'deleted';

// ✅ 应该：明确条件
UPDATE documents SET status = 'deleted' WHERE id = ?1;
```

### ❌ 文件操作禁忌

```rust
// ❌ 禁止：直接使用路径拼接
let path = format!("{}/{}", base_path, filename);

// ✅ 应该：使用 PathBuf
use std::path::PathBuf;
let path: PathBuf = [base_path, filename].iter().collect();

// ❌ 禁止：同步阻塞文件操作
std::fs::write(&path, content)?;

// ✅ 应该：异步操作
tokio::fs::write(&path, content).await?;
```

---

## 5. 安全禁止

### ❌ 前端安全禁忌

```typescript
// ❌ 禁止：dangerouslySetInnerHTML 无过滤
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ 应该：使用 DOMPurify 过滤
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />

// ❌ 禁止：eval / new Function
const result = eval(userCode);

// ❌ 禁止：innerHTML 直接赋值
element.innerHTML = userInput;
```

### ❌ 后端安全禁忌

```rust
// ❌ 禁止：暴露敏感错误信息
Err(e) => {
  println!("数据库连接失败: {:?}", e);  // 可能包含密码
  Err("内部错误".into())
}

// ✅ 应该：记录详细错误，返回通用信息
Err(e) => {
  log::error!("数据库连接失败: {:?}", e);  // 记录到日志
  Err("服务暂时不可用".into())  // 返回给用户
}

// ❌ 禁止：不验证用户输入路径
let path = req.path;  // 用户可能传入 ../../../etc/passwd

// ✅ 应该：路径验证
use std::path::Path;
let path = Path::new(&req.path);
if !path.starts_with(&allowed_base) {
  return Err("非法路径".into());
}
```

---

## 6. 用户体验禁止

### ❌ 交互禁忌

```typescript
// ❌ 禁止：无反馈的长时间操作
function handleDelete() {
  deleteDocument(id);  // 可能耗时，但无反馈
}

// ✅ 应该：提供加载状态
function handleDelete() {
  setIsDeleting(true);
  deleteDocument(id).finally(() => setIsDeleting(false));
}

// ❌ 禁止：突然跳转无提示
<button onClick={() => navigate('/other')}>

// ✅ 应该：有明确提示的跳转
<button onClick={() => {
  if (hasUnsavedChanges) {
    if (confirm('有未保存的更改，确定离开？')) {
      navigate('/other');
    }
  } else {
    navigate('/other');
  }
}}>

// ❌ 禁止：无防抖的按钮
<button onClick={handleClick}>

// ✅ 应该：防止重复点击
const [isLoading, setIsLoading] = useState(false);
<button 
  disabled={isLoading}
  onClick={async () => {
    setIsLoading(true);
    await handleClick();
    setIsLoading(false);
  }}
>
```

### ❌ 动画与过渡禁忌

```css
/* ❌ 禁止：过长的动画 */
transition: all 0.5s ease;
animation-duration: 1s;

/* ✅ 应该：快速响应 */
transition: all 150ms ease;
animation-duration: 200ms;

/* ❌ 禁止：过多动画同时播放 */
/* 10+ 元素同时动画 */

/* ✅ 应该：错开动画或使用 will-change */
animation-delay: calc(var(--index) * 50ms);
will-change: transform, opacity;
```

---

## 7. 代码组织禁止

### ❌ 导入禁忌

```typescript
// ❌ 禁止：循环依赖
// file-a.ts
import { b } from './file-b';
// file-b.ts
import { a } from './file-a';  // 循环！

// ❌ 禁止：从 index 导入导致循环
import { Component } from './components';  // 可能循环

// ✅ 应该：直接导入具体文件
import { Component } from './components/Component';

// ❌ 禁止：通配符导入
import * as utils from './utils';

// ✅ 应该：具名导入
import { cn, formatDate } from './utils';
```

### ❌ 类型定义禁忌

```typescript
// ❌ 禁止：使用 any
function process(data: any): any

// ✅ 应该：明确类型
function process<T extends Document>(data: T): ProcessedResult<T>

// ❌ 禁止：重复类型定义
// file-a.ts
interface User { id: string; name: string; }
// file-b.ts
interface User { id: string; name: string; }  // 重复！

// ✅ 应该：集中类型定义
// types/user.ts
export interface User { id: string; name: string; }
```

---

## 8. 测试与调试禁止

### ❌ 调试代码禁忌

```typescript
// ❌ 禁止：提交 console.log
console.log('debug:', data);
console.warn('here');

// ✅ 应该：使用日志库
import { logger } from './utils/logger';
logger.debug('数据加载', { docId, count });

// 或在开发完成后删除

// ❌ 禁止：提交硬编码测试数据
const docs = [
  { id: '1', title: 'Test' },  // 假数据
];

// ✅ 应该：使用 mock 数据或真实 API
// 在测试文件中 mock
jest.mock('./api', () => ({
  fetchDocs: () => Promise.resolve(mockDocs)
}));

// ❌ 禁止：注释掉的代码提交
// function oldFeature() { ... }
// const unused = ...;

// ✅ 应该：删除或保留说明
/* 旧版本实现，保留原因：XXX */
```

---

## 检查清单

提交代码前检查：

- [ ] 没有蓝色/黄色/橙色类名
- [ ] 没有 `console.log`
- [ ] 没有 `any` 类型（除非有注释说明）
- [ ] 没有直接修改 props
- [ ] 没有 SQL 字符串拼接
- [ ] 没有循环依赖
- [ ] 没有遗留的注释代码
- [ ] 关键组件有 `key` 属性
