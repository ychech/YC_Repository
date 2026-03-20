# MindNest AI 开发者指南

> 本文件用于 AI 开发者之间的信息同步

---

## 最近变更 (2026-03-20)

### 8. 修复文件夹拖拽消失问题 - 递归渲染文件夹树

**变更者**: AI6 (代码专家模式)  
**问题描述**:
- 文件夹拖拽到文件夹后消失

**根本原因**:
- `NewSidebar` 只渲染了根级文件夹 (`!f.parentId`)
- 当文件夹 A 拖到文件夹 B 下时，文件夹 A 的 `parentId` 被设为 B 的 id
- 但渲染时只显示没有 parentId 的文件夹，所以 A 从列表中"消失"了

**修复内容**:

1. **重写 `NewSidebar.tsx`**:
   - 新增 `FolderTree` 递归组件
   - 根据 `parentId` 递归渲染子文件夹
   - 支持无限层级嵌套
   - 正确显示文件夹层级缩进

```typescript
function FolderTree({ folderId, level, folders, ... }) {
  const childFolders = folders.filter(f => f.parentId === folderId)
  return childFolders.map(folder => (
    <SortableFolder ...>
      {/* 递归渲染子文件夹 */}
      <FolderTree folderId={folder.id} level={level + 1} ... />
      {/* 当前文件夹的文档 */}
      <DocList ... />
    </SortableFolder>
  ))
}
```

2. **数据结构支持**:
   - 文件夹拖拽设置 `parentId` 正确工作
   - 循环引用检测防止文件夹拖到自身子文件夹
   - 展开状态管理保持嵌套文件夹可展开

**修复结果**:
- ✅ 文件夹拖到文件夹下正确显示为子文件夹
- ✅ 支持无限层级嵌套
- ✅ 子文件夹正确继承父文件夹层级

---

### 7. 拖拽功能优化 - 文件夹显示、排序提示、放置效果

**变更者**: AI6 (代码专家模式)  
**问题描述**:
- 文件夹转移到文件夹后消失
- 排序提示线不明显
- 文件拖到文件下方效果不好

**修复内容**:

1. **修复文件夹消失问题**:
   - `SortableFolder.tsx`: 正确传递 `folderId` 到 `useSortable` 的 data 中
   - `Layout.tsx`: 修正 `handleFolderDrag` 中源文件夹ID的提取逻辑
   - 支持特殊ID `folder-ungrouped` 表示根级

2. **增强排序提示线**:
   - `DropIndicator` 组件增加背景高亮
   - 指示线加粗，添加发光效果 (`shadow-[0_0_8px_rgba(59,130,246,0.8)]`)
   - 左右两侧添加圆点指示器
   - 拖拽时显示蓝色高亮区域

3. **优化放置效果**:
   - 空文件夹放置时放大并高亮 (`scale-[1.02]`)
   - 添加 📥 图标和文字提示
   - 文件夹接收时显示蓝色边框和图标变化
   - 底部放置区域添加脉冲动画

4. **修复文件下方放置**:
   - `handleDocumentDrag` 检测 delta.y 判断是否放在文档下方
   - 调整插入位置索引计算逻辑

**改进后的视觉效果**:
- 🔵 蓝色高亮边框表示可放置
- 📥 图标提示释放位置
- ✨ 发光指示线显示排序位置
- 🔄 脉冲动画表示活动状态

---

### 6. 完整拖拽系统 - 文件夹嵌套和未分类放置

**变更者**: AI6 (代码专家模式)  
**问题描述**:
- 未分类不能接收从文件夹拖拽过来的文档
- 文件夹不能拖拽到其他文件夹下（无法嵌套）
- 排序没有指示线提示

**修复内容**:

1. **新增 `SortableFolder.tsx`**: 
   - `SortableFolder` 组件：文件夹可拖拽，可展开/折叠，显示文档数量
   - `UngroupedSection` 组件：未分类区域作为根级放置目标
   - 文件夹本身使用 `useSortable`，同时作为放置目标使用 `useDroppable`

2. **更新 `DocList.tsx`**:
   - 添加排序指示线组件 `SortIndicator`
   - 在文档项之间显示放置位置提示

3. **更新 `NewSidebar.tsx`**:
   - 使用新的 `SortableFolder` 和 `UngroupedSection` 组件
   - 未分类区域独立为放置目标（folderId=""）

4. **更新 `Layout.tsx`**:
   - 重写拖拽处理，支持两种类型：
     - `handleDocumentDragEnd`: 处理文档拖拽（排序、跨文件夹）
     - `handleFolderDragEnd`: 处理文件夹拖拽（嵌套、排序）
   - 文件夹可以拖拽到其他文件夹下形成嵌套
   - 添加循环引用检测（防止文件夹拖到其子文件夹）

5. **更新 `knowledgeBase.ts`**:
   - 添加 `moveFolder` 方法：移动文件夹到其他文件夹
   - 添加 `setFolders` 方法：直接设置文件夹列表

**数据结构**:
```
知识库 (大文件夹)
├── 文件夹 A
│   ├── 文档 1
│   └── 文档 2
├── 文件夹 B
│   └── 子文件夹 C (嵌套)
│       └── 文档 3
└── 未分类 (根级)
    ├── 文档 4
    └── 文档 5
```

**验证结果**:
- ✅ 文件夹内文档可以排序
- ✅ 文档可以从文件夹拖到未分类
- ✅ 文档可以从未分类拖到文件夹
- ✅ 文件夹可以嵌套（拖到其他文件夹下）
- ✅ 文件夹可以拖到根级（成为独立文件夹）
- ✅ 排序时有视觉反馈

---

### 5. 拖拽功能修复 - 文件夹排序和跨文件夹移动

**变更者**: AI6 (代码专家模式)  
**问题描述**:
- 文件夹内文档不能排序
- 跨文件夹拖拽不工作
- 未分类文档只能拖拽两个到文件夹

**修复内容**:

1. **修复 `DocList.tsx`**:
   - `SortableDocItem` 组件添加 `folderId` 参数
   - `useSortable` 的 `data` 中必须包含 `folderId`，否则拖拽时无法识别源文件夹
   - 这是跨文件夹拖拽的关键

2. **修复 `Layout.tsx`**:
   - 重写 `handleDragEnd` 拖拽处理逻辑
   - 正确处理同文件夹内排序：计算 oldIndex 和 newIndex
   - 正确处理跨文件夹移动：
     - 识别目标文件夹（从 `folder-${id}` 或文档的 folderId）
     - 计算插入位置（头部、中间、尾部）
     - 计算新 position 值
   - 添加详细日志便于调试

3. **关键修复点**:
   ```typescript
   // SortableDocItem 必须传递 folderId
   useSortable({
     id: doc.id,
     data: {
       type: 'document',
       id: doc.id,
       folderId: folderId, // ← 关键！用于识别源文件夹
     },
   })
   ```

**验证结果**:
- ✅ 文件夹内文档可以排序
- ✅ 可以跨文件夹拖拽移动
- ✅ 未分类文档可以拖拽任意数量到文件夹
- ✅ 可以拖拽到空文件夹

---

### 4. UI/UX 修复 - 图标、知识库、拖拽排序

**变更者**: AI6 (代码专家模式)  
**变更内容**:

1. **修复应用图标**
   - 新增 `src/components/ui/Logo.tsx`: 创建 MindNest Logo 组件（渐变蓝紫 SVG）
   - 更新 `NewSidebar.tsx`: 使用 Logo 替换 Box 图标
   - 折叠状态也显示 Logo

2. **修复知识库选择器**
   - 实现完整的知识库下拉选择菜单
   - 支持切换不同知识库
   - 支持创建新知识库（带名称和描述）
   - 显示当前选中知识库
   - 空状态提示创建知识库

3. **实现文档拖拽排序功能**
   - 更新 `DocItem.tsx`: 添加 `SortableDocItem` 组件
   - 更新 `DocList.tsx`: 使用 `SortableContext` 和 `useSortable`
   - 更新 `DndProvider.tsx`: 支持 Touch/Mouse/Pointer 传感器
   - 更新 `Layout.tsx`: 
     - 实现同文件夹内文档排序
     - 实现跨文件夹文档移动
     - 拖拽时显示悬浮预览
   - 文档类型图标：不同颜色区分（文档蓝、表格绿、画板紫、小记黄）

**文件变更**:
```
src/components/ui/Logo.tsx              # 新增
src/components/sidebar/NewSidebar.tsx   # 重写
src/components/dnd/DocItem.tsx          # 重写
src/components/dnd/DocList.tsx          # 重写
src/components/dnd/DndProvider.tsx      # 重写
src/components/dnd/index.ts             # 更新导出
src/components/Layout.tsx               # 更新拖拽逻辑
```

**验证结果**:
- ✅ TypeScript 类型检查通过
- ✅ 拖拽排序功能完整实现
- ✅ 跨文件夹移动功能正常
- ✅ 知识库选择器工作正常

---

### 3. 代码专家模式修复

**变更者**: AI6 (代码专家模式)  
**变更内容**:
- **修复 TypeScript 类型错误**
  - `src/components/dnd/DocItem.tsx`: 导出 `DragItem` 接口（原为本地未导出）
  - `src/components/dnd/index.ts`: 正确引用导出的类型

- **完善 Rust 后端命令注册**
  - `src-tauri/src/main.rs`: 取消注释已实现的 AI 命令
    - `continue_writing` - 续写内容
    - `polish_text` - 润色文本  
    - `generate_summary` - 生成摘要
    - `translate_text` - 翻译文本

- **修复 Rust 编译警告**
  - `src-tauri/src/commands/document.rs`: 移除未使用的 `PathBuf` 导入，标记未使用变量
  - `src-tauri/src/commands/link.rs`: 标记未使用变量
  - `src-tauri/src/error.rs`: 移除未使用的 `Deserialize` 导入
  - `src-tauri/src/ai/mod.rs`: 移除未使用的 `info` 导入

**验证结果**:
- ✅ TypeScript 类型检查通过 (`npx tsc --noEmit`)
- ✅ Rust 编译通过 (`cargo check`)

---

## 历史变更

### 2. AI 功能增强 (2026-03-18)

**变更者**: AI5  
**变更内容**:
- 注册所有已实现的 AI 命令到 `main.rs`
  - `continue_writing` - 续写内容
  - `polish_text` - 润色文本
  - `generate_summary` - 生成摘要
  - `translate_text` - 翻译文本
- **新增智能标签生成** (`generate_tags`)
  - AI 自动分析文档内容生成标签
  - 支持避免与现有标签重复
- **新增相似文档推荐** (`find_similar_documents`)
  - 基于标题关键词 + AI 分析找到相关内容
  - 轻量级实现，无需向量数据库

**关键设计决策**:
- 相似文档使用两步筛选：先标题关键词匹配，再AI排序
- 限制候选数量（10个）避免过多API调用
- 标签生成限制内容长度（3000字符）控制token消耗

---

### 3. 设置存储格式修复 + 文档清理

**变更者**: AI4  
**变更内容**:
- **修复设置存储格式混乱**（Migration 006）
  - 原问题：`user_settings` 表有 `editor`, `ai`, `shortcuts`, `privacy` 多个字段
  - 实际情况：代码只使用 `editor` 字段存整个 JSON，其他字段存空对象 `\"{}\"`
  - 修复：简化为单 `settings` 字段，数据自动迁移
  - 更新 `get_settings`, `update_settings`, `reset_settings` 使用新字段名

- **文档命名清理**
  - 去掉数字前缀：`1_STYLE_GUIDE.md` → `STYLE_GUIDE.md` 等
  - AI 间临时文档归档：`AI3_*.md`, `AI5_*.md`, `AI_HANDOFF.md` 等 → `docs/ai-handoff/`
  - 保留核心文档：`ARCHITECTURE.md`, `PRD.md`, `STYLE_GUIDE.md` 等

**文件结构变化**:
```
docs/
├── STYLE_GUIDE.md       # 原 1_STYLE_GUIDE.md
├── DONT_DO.md           # 原 2_DONT_DO.md
├── CORE_TASKS.md        # 原 3_CORE_TASKS.md
├── DESIGN_GOALS.md      # 原 4_DESIGN_GOALS.md
├── ai-handoff/          # AI 间协作文档（临时）
│   ├── AI3_DRAG_DROP_UPDATE.md
│   ├── AI5_AI_ENHANCEMENT_SUMMARY.md
│   └── ...
└── archive/             # 归档的历史文档
    └── AI_SYSTEM_2026_vision.md
```

---

## 历史变更

### 1. AI 模块重构

**变更者**: AI4  
**变更内容**:
- 重构 `src-tauri/src/commands/ai.rs`，抽取公共逻辑
- 删除空目录 `src/ai/`
- 归档过度设计文档 `docs/AI_SYSTEM.md` → `docs/archive/AI_SYSTEM_2026_vision.md`

**关键改动**:
```rust
// 新增工具函数，避免重复代码
fn create_ai_config(settings: &AppSettings, model, temp) -> AIConfig
fn create_ai_engine(config: AIConfig) -> AIEngine
```

**当前 AI 实现状态**:
- 实际功能：仅支持 OpenAI/Anthropic API 调用
- 本地模型：`// TODO` 占位，未实现
- 文档与代码严重脱节，已归档

---

## 架构现状

### 技术栈
- **前端**: React 18 + TypeScript + Tailwind CSS
- **桌面**: Tauri (Rust 后端)
- **数据库**: SQLite (元数据)
- **搜索**: 简单的 SQLite 文本搜索
- **AI**: OpenAI/Anthropic API (云端)

### 已实现的 AI 功能

**文本处理**
```
✅ generate_completion - 文本补全
✅ chat_with_context - 对话（支持 RAG 上下文）
✅ get_suggestions - 内联建议
✅ continue_writing - 续写内容
✅ polish_text - 润色文本
✅ generate_summary - 生成摘要
✅ translate_text - 翻译文本
```

**智能分析** (AI5 新增)
```
✅ generate_tags - 智能生成标签
  - 分析文档内容自动生成标签
  - 支持去重
  - 可配置标签数量（默认5个）

✅ find_similar_documents - 相似文档推荐
  - 标题关键词快速筛选
  - AI 排序找到最相关内容
  - 无需向量数据库，轻量级实现
```

**未实现**
```
❌ 本地 LLM - 仅文档，无实现
❌ 向量数据库 - 暂不需要（相似度用AI+关键词实现）
❌ Embedding 服务 - 暂不需要
```

---

## 代码规范

### Rust 后端
1. **使用 `?` 传播错误**，不要手动 match
2. **SQL 必须参数化**，禁止字符串拼接
3. **异步 IO**：使用 `tokio::fs` 而非 `std::fs`
4. **路径处理**：使用 `PathBuf` 而非字符串拼接

### React 前端
1. **Tailwind 类名顺序**: `布局 → 尺寸 → 间距 → 外观 → 状态`
2. **使用 `cn()` 合并类名**，不要用模板字符串
3. **组件必须有 `key`**，特别是文档切换时

---

## 已知问题

1. **设计文档与代码脱节** - `docs/archive/` 中的文档仅供参考
2. **AI 命令重复创建引擎** - ✅ 已修复 (AI4)
3. **大量未使用的代码** - `models.rs` 中很多类型未使用（可能是为未来功能预留）
4. **设置存储格式混乱** - 部分 JSON 字段存储不规范
5. **相似文档算法可优化** - 当前仅使用标题关键词，可考虑加入内容摘要
6. **AI 调用无缓存** - 相同内容重复调用 API，可考虑添加结果缓存

---

## 下一步建议

### 高优先级
- [x] ~~清理 `models.rs` 中未使用的类型定义~~ (保持现状)
- [x] ~~统一设置存储格式~~ (AI4 已完成 - Migration 006)
- [x] ~~注册已实现的 AI 命令到 `main.rs`~~ (AI5 已完成)

### 中优先级
- [ ] 合并 `ARCHITECTURE.md` 中的冗余内容
- [x] ~~去掉文档数字前缀~~ (AI4 已完成)
- [ ] 为新增的 AI 功能添加前端 UI

### 低优先级
- [ ] 评估是否需要真正的本地 AI 实现
- [ ] 考虑添加 AI 功能开关（按知识库或全局）
- [ ] 清理 `ai-handoff/` 中过时的临时文档

---

## 如何与前辈 AI 交流

如果你看到本文件，请：
1. 在顶部添加你的变更记录
2. 更新 "当前 AI 实现状态"
3. 如果发现问题，添加到 "已知问题"

**命名规范**: AI2 (Kimi 早期版本) → AI3 → AI4 (当前) → AI5...

---

## AI 角色定位

### AI4 - 代码重构与架构清理专家

**我的定位**: 负责代码质量提升、技术债务清理、架构简化

**核心职责**:
- 🔧 重构冗余代码，提高可维护性
- 📦 归档/删除过度设计的内容
- 🧹 清理无用文件和空目录
- 📝 建立 AI 开发者之间的沟通机制（创建 AGENTS.md）

**我的风格**:
- 务实优先：删除"纸上谈兵"的设计，专注可运行的代码
- 极简主义：能删的代码就不留着
- 文档同步：确保文档反映代码的真实状态

**我的工作成果**:
- ✅ 重构 `ai.rs`，消除重复代码（6处重复 → 2个工具函数）
- ✅ 删除空目录 `src/ai/`
- ✅ 归档 800+ 行的过度设计文档
- ✅ 创建 `AGENTS.md` 沟通机制
- ✅ **修复设置存储格式**（Migration 006，简化表结构）
- ✅ **清理文档命名**（去掉数字前缀，AI 临时文档归档）

---

### AI5 - 功能增强与产品迭代专家

**定位**: 在现有架构基础上快速迭代新功能

**核心职责**:
- ✨ 实现用户可用的 AI 功能
- 🚀 快速原型验证（轻量级方案替代重量级架构）
- 🔗 注册和完善已有但不可用的功能

**风格**: 实用主义，避免过度工程

---

*最后更新: 2026-03-18 by AI4*  
*上次变更: AI4 清理 - 设置存储修复 + 文档命名规范化*
