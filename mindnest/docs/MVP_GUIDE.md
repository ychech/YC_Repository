# MindNest MVP 启动指南

> 从 0 到 1 构建你的 AI 知识库

---

## 1. 开发环境准备

### 1.1 前置要求

```bash
# 必需
- Rust 1.75+ (后端)
- Node.js 20+ (前端)
- Tauri CLI 2.0+
- Git

# 推荐
- VS Code with rust-analyzer, ESLint
- pnpm (替代 npm)
```

### 1.2 初始化项目

```bash
# 克隆项目
git clone https://github.com/yourusername/mindnest.git
cd mindnest

# 安装前端依赖
pnpm install

# 安装 Rust 依赖 (自动)
cargo fetch

# 初始化数据库目录
mkdir -p ~/.local/share/MindNest

# 运行开发服务器
pnpm tauri dev
```

---

## 2. 项目结构

```
mindnest/
├── src-tauri/                 # Rust 后端
│   ├── src/
│   │   ├── main.rs           # 入口
│   │   ├── models.rs         # 数据模型
│   │   ├── db/               # 数据库
│   │   │   ├── mod.rs
│   │   │   └── migrations.rs
│   │   ├── commands/         # Tauri 命令
│   │   │   ├── mod.rs
│   │   │   ├── document.rs
│   │   │   ├── ai.rs
│   │   │   └── ...
│   │   ├── ai/               # AI 引擎
│   │   │   ├── mod.rs
│   │   │   ├── embedding.rs
│   │   │   └── llm.rs
│   │   ├── search/           # 搜索引擎
│   │   └── graph/            # 图谱引擎
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                       # React 前端
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── editor/
│   │   │   ├── BlockEditor.tsx
│   │   │   ├── SlashMenu.tsx
│   │   │   └── LinkMenu.tsx
│   │   └── graph/
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── EditorPage.tsx
│   │   ├── GraphPage.tsx
│   │   └── SearchPage.tsx
│   ├── stores/               # Zustand 状态管理
│   │   ├── document.ts
│   │   ├── knowledgeBase.ts
│   │   └── settings.ts
│   ├── hooks/                # 自定义 Hooks
│   ├── utils/                # 工具函数
│   ├── styles/
│   │   └── globals.css
│   ├── main.tsx
│   └── router.tsx
├── docs/                      # 文档
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── AI_SYSTEM.md
│   └── BUSINESS.md
├── design/                    # 设计资源
└── package.json
```

---

## 3. 核心功能实现路线图

### Phase 1: 基础框架 (Week 1-2)

```
✅ 项目初始化
✅ 数据库设计 (SQLite)
✅ 基础数据模型
✅ Tauri 命令框架
✅ React + Tailwind 配置
```

### Phase 2: 编辑器核心 (Week 3-4)

```
□ TipTap 集成
□ 基础块类型 (段落、标题、列表)
□ Slash 命令菜单
□ 双向链接 [[ ]]
□ 链接预览
□ Markdown 导入/导出
```

**实现优先级**:
1. 纯文本编辑 + 保存
2. 块级操作 (增删改)
3. 富文本格式
4. 高级块 (代码、表格)
5. 链接系统

### Phase 3: 知识组织 (Week 5-6)

```
□ 文档树层级
□ 标签系统
□ 双向链接解析
□ 孤儿笔记检测
□ 最近编辑
□ 收藏/置顶
```

### Phase 4: AI 集成 (Week 7-8)

```
□ 嵌入模型下载 (bge-m3)
□ 文档向量化
□ LanceDB 集成
□ 基础语义搜索
□ AI 写作助手 (云端 API)
□ 智能标签推荐
```

### Phase 5: 图谱可视化 (Week 9-10)

```
□ 全局图谱 (2D)
□ Force Graph 布局
□ 节点交互
□ 筛选与搜索
□ 局部图谱
```

### Phase 6:  polish (Week 11-12)

```
□ 深色模式
□ 快捷键系统
□ 命令面板
□ 设置页面
□ 导入导出
□ 自动更新
```

---

## 4. 关键技术实现

### 4.1 TipTap 编辑器配置

```typescript
// src/components/editor/useBlockEditor.ts
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { WikiLink } from './extensions/WikiLink'

export function useBlockEditor({ content, onChange }) {
  return useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      WikiLink.configure({
        handleClick: (docId) => navigate(`/doc/${docId}`),
      }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  })
}
```

### 4.2 双向链接扩展

```typescript
// src/components/editor/extensions/WikiLink.ts
import { Node, mergeAttributes } from '@tiptap/core'

export const WikiLink = Node.create({
  name: 'wikiLink',
  
  group: 'inline',
  inline: true,
  selectable: true,
  
  addAttributes() {
    return {
      docId: { default: null },
      title: { default: null },
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'a[data-wiki-link]',
        getAttrs: (el) => ({
          docId: el.getAttribute('data-doc-id'),
          title: el.textContent,
        }),
      },
    ]
  },
  
  renderHTML({ HTMLAttributes, node }) {
    return ['a', mergeAttributes(
      { 'data-wiki-link': '', class: 'wiki-link' },
      HTMLAttributes
    ), node.attrs.title]
  },
  
  addInputRules() {
    return [
      nodeInputRule({
        find: /\[\[([^\]]+)\]\]$/,
        type: this.type,
        getAttributes: (match) => {
          const title = match[1]
          const docId = findDocByTitle(title)
          return { docId, title }
        },
      }),
    ]
  },
})
```

### 4.3 向量搜索实现

```rust
// src-tauri/src/ai/vector_store.rs
use lancedb::connect;
use arrow_array::RecordBatch;

pub struct VectorStore {
    table: Table,
}

impl VectorStore {
    pub async fn new(db_path: &str) -> Result<Self> {
        let db = connect(db_path).execute().await?;
        let table = db.open_table("embeddings").execute().await?;
        Ok(Self { table })
    }
    
    pub async fn search(&self, query: &[f32], top_k: usize) -> Result<Vec<SearchResult>> {
        let results = self.table
            .search(query)
            .limit(top_k)
            .execute()
            .await?;
            
        // Convert to SearchResult
        Ok(results.into())
    }
}
```

---

## 5. 构建与发布

### 5.1 本地构建

```bash
# 开发模式
pnpm tauri dev

# 生产构建
pnpm tauri build

# 仅前端构建
pnpm build
```

### 5.2 发布流程

```bash
# 1. 版本更新
vim Cargo.toml  # 更新 version
vim package.json

# 2. 更新 CHANGELOG
vim CHANGELOG.md

# 3. 打标签
git tag v0.1.0
git push origin v0.1.0

# 4. GitHub Actions 自动构建
# - Windows (.msi)
# - macOS (.dmg, .app)
# - Linux (.AppImage, .deb)

# 5. 发布到更新服务器
pnpm tauri updater
```

### 5.3 代码签名

```bash
# macOS
# 需要 Apple Developer 证书
export APPLE_CERTIFICATE="..."
export APPLE_CERTIFICATE_PASSWORD="..."
export APPLE_ID="..."
export APPLE_PASSWORD="..."
pnpm tauri build --target universal-apple-darwin

# Windows
# 需要代码签名证书
export WINDOWS_CERTIFICATE="..."
export WINDOWS_CERTIFICATE_PASSWORD="..."
pnpm tauri build --target x86_64-pc-windows-msvc
```

---

## 6. 测试策略

### 6.1 单元测试

```rust
// src-tauri/src/db/tests.rs
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_create_document() {
        let db = Database::init_in_memory().await.unwrap();
        let doc = create_test_document();
        
        db.create_document(&doc).await.unwrap();
        
        let fetched = db.get_document(&doc.id).await.unwrap();
        assert_eq!(fetched.title, doc.title);
    }
}
```

### 6.2 E2E 测试

```typescript
// tests/editor.spec.ts
import { test, expect } from '@playwright/test'

test('create and edit document', async ({ page }) => {
  await page.goto('/')
  await page.click('text=新建文档')
  await page.fill('[placeholder="标题"]', 'Test Document')
  await page.fill('.ProseMirror', 'Hello World')
  
  await expect(page.locator('text=Test Document')).toBeVisible()
})
```

---

## 7. 性能优化

### 7.1 启动优化

```rust
// 延迟加载重型组件
#[tokio::main]
async fn main() {
    // 1. 快速显示窗口
    let app = tauri::Builder::default()
        .setup(|app| {
            // 显示窗口
            let window = app.get_window("main").unwrap();
            window.show().unwrap();
            
            // 后台初始化
            tauri::async_runtime::spawn(async {
                init_heavy_components().await;
            });
            
            Ok(())
        })
        .build();
}
```

### 7.2 渲染优化

```typescript
// 虚拟滚动长文档
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualEditor({ blocks }) {
  const parentRef = useRef()
  const virtualizer = useVirtualizer({
    count: blocks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  })
  
  return (
    <div ref={parentRef}>
      {virtualizer.getVirtualItems().map((item) => (
        <Block key={item.key} block={blocks[item.index]} />
      ))}
    </div>
  )
}
```

---

## 8. 社区与贡献

### 8.1 开源策略

- **核心代码**: AGPL-3.0 (开源)
- **插件**: MIT (鼓励开发)
- **品牌**: 保留商标权

### 8.2 贡献指南

```
1. Fork 项目
2. 创建分支: git checkout -b feature/amazing-feature
3. 提交更改: git commit -m 'Add amazing feature'
4. 推送分支: git push origin feature/amazing-feature
5. 创建 Pull Request
```

### 8.3 行为准则

- 友善包容
- 建设性反馈
- 专注技术
- 尊重隐私

---

## 9. 常见问题

### Q: 如何添加新的块类型?
A: 1. 在 `BlockType` enum 中添加类型
   2. 在 TipTap 中创建扩展
   3. 在 SlashMenu 中添加命令
   4. 在数据库中存储格式

### Q: 如何集成新的 AI 模型?
A: 1. 在 `models.yml` 中定义模型
   2. 在 `ModelManager` 中实现下载逻辑
   3. 在 `LLM` trait 中实现推理
   4. 更新 UI 中的模型选择器

### Q: 如何实现跨设备同步?
A: 1. 使用 SQLite 的 WAL 模式
   2. 实现 CRDT 合并逻辑
   3. 选择同步后端 (WebDAV/S3/自建)
   4. 端到端加密

---

## 10. 资源链接

- 文档: https://docs.mindnest.app
- 社区: https://discord.gg/mindnest
- 博客: https://blog.mindnest.app
- Twitter: https://twitter.com/mindnest
- Roadmap: https://github.com/mindnest/roadmap

---

## 下一步行动

1. ☐ 完成开发环境搭建
2. ☐ 运行第一个 `pnpm tauri dev`
3. ☐ 创建第一篇测试文档
4. ☐ 实现基础 AI 功能
5. ☐ 邀请第一批内测用户
6. ☐ Product Hunt 发布准备

**Happy Building! 🚀**
