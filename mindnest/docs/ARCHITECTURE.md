# MindNest 技术架构文档

> 版本: v1.0  
> 架构风格: 本地优先、模块化、事件驱动

---

## 1. 架构概览

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              表现层 (Presentation)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Desktop    │  │     Web      │  │   Mobile     │  │  Browser     │    │
│  │   (Tauri)    │  │   (React)    │  │(React Native)│  │  Extension   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
└─────────┼─────────────────┼─────────────────┼─────────────────┼────────────┘
          │                 │                 │                 │
          └─────────────────┴────────┬────────┴─────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────────┐
│                           核心引擎层 (Core Engine)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Editor     │  │   Graph      │  │    AI        │  │    Sync      │    │
│  │   Engine     │  │   Engine     │  │   Engine     │  │   Engine     │    │
│  │  (Rust/TS)   │  │  (Rust/WASM) │  │  (Rust/TS)   │  │  (Rust/TS)   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Search     │  │   Index      │  │    OCR       │  │   Import/    │    │
│  │   Engine     │  │   Engine     │  │  Engine      │  │   Export     │    │
│  │  (Tantivy)   │  │  (SQLite)    │  │  (Rust)      │  │   Engine     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────────┐
│                            数据存储层 (Storage)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   SQLite     │  │   Markdown   │  │   Vector     │  │    Blob      │    │
│  │  (Metadata)  │  │   (Content)  │  │  (LanceDB)   │  │   Store      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │   Config     │  │   Cache      │  │    Log       │                       │
│  │   Store      │  │   Store      │  │   Store      │                       │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 技术选型理由

| 技术 | 选择 | 理由 |
|------|------|------|
| **Tauri** | 桌面框架 | Rust 核心、体积小(比 Electron 小 90%)、安全沙箱 |
| **React 18** | UI 框架 | 生态成熟、并发特性、良好的 TypeScript 支持 |
| **Zustand** | 状态管理 | 轻量、简洁、无样板代码 |
| **TanStack Query** | 数据获取 | 强大的缓存、乐观更新、离线支持 |
| **TipTap** | 编辑器 | 基于 ProseMirror、可扩展性强、协同编辑支持 |
| **SQLite** | 元数据存储 | 零配置、事务安全、跨平台 |
| **LanceDB** | 向量数据库 | 本地优先、无需服务器、Arrow 格式 |
| **Tantivy** | 全文搜索 | Rust 编写、高性能、支持中文分词 |
| **candle** | 本地 ML | Rust 机器学习框架、无需 Python 依赖 |

---

## 2. 模块详细设计

### 2.1 编辑器引擎 (Editor Engine)

#### 架构设计
```
┌─────────────────────────────────────────────────────────────┐
│                    Editor Architecture                       │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (React Components)                                │
│  ├── BlockRenderer (渲染不同块类型)                          │
│  ├── SlashMenu (/命令菜单)                                   │
│  ├── LinkPopover (链接悬浮卡片)                              │
│  └── Toolbar (浮动/固定工具栏)                               │
├─────────────────────────────────────────────────────────────┤
│  Core Layer (ProseMirror + Yjs)                             │
│  ├── Schema Definition (文档结构定义)                        │
│  ├── Transaction System (事务系统)                           │
│  ├── Collaborative Editing (Yjs CRDT)                       │
│  └── Plugin System (插件扩展)                                │
├─────────────────────────────────────────────────────────────┤
│  Adapter Layer                                              │
│  ├── Markdown Parser (mdast → ProseMirror)                  │
│  ├── Markdown Serializer (ProseMirror → mdast)              │
│  └── Blocknote Adapter (BlockNote 格式兼容)                  │
└─────────────────────────────────────────────────────────────┘
```

#### 核心 Schema 定义
```typescript
// 文档节点类型
interface DocumentSchema {
  // 根节点
  doc: {
    content: 'block+'
  }
  
  // 块级节点
  paragraph: { content: 'inline*' }
  heading: { attrs: { level: 1-6 }, content: 'inline*' }
  codeBlock: { attrs: { language?: string }, content: 'text*' }
  bulletList: { content: 'listItem+' }
  orderedList: { content: 'listItem+' }
  listItem: { content: 'paragraph block*' }
  blockquote: { content: 'block+' }
  
  // 特殊块
  aiBlock: { attrs: { type: 'generate' | 'summary', status: 'pending' | 'done' } }
  embedBlock: { attrs: { url: string, type: string } }
  tableBlock: { content: 'tableRow+' }
  
  // 行内节点
  text: {}
  hardBreak: {}
  mention: { attrs: { id: string, label: string, type: 'page' | 'user' | 'date' } }
}
```

### 2.2 AI 引擎 (AI Engine)

#### 分层架构
```
┌─────────────────────────────────────────────────────────────┐
│                     AI Engine Layers                         │
├─────────────────────────────────────────────────────────────┤
│  Application Layer                                          │
│  ├── WritingAssistant (写作助手)                             │
│  ├── KnowledgeQA (知识问答)                                  │
│  ├── InsightEngine (洞察引擎)                                │
│  └── AutoTagger (自动标签)                                   │
├─────────────────────────────────────────────────────────────┤
│  RAG Layer                                                  │
│  ├── Query Understanding (查询理解)                          │
│  ├── Hybrid Retrieval (混合检索)                             │
│  │   ├── Dense Retrieval (向量检索)                          │
│  │   ├── Sparse Retrieval (BM25)                             │
│   │   └── Graph Retrieval (图谱检索)                         │
│  ├── Reranking (重排序)                                      │
│  └── Context Assembly (上下文组装)                           │
├─────────────────────────────────────────────────────────────┤
│  Model Layer                                                │
│  ├── Embedding Models (bge-m3, nomic)                       │
│  ├── Local LLM (Phi-4, Qwen2.5, via candle/llama.cpp)       │
│  ├── Cloud LLM (OpenRouter, 统一接口)                        │
│  └── Model Router (智能路由，本地/云端切换)                   │
├─────────────────────────────────────────────────────────────┤
│  Vector Store Layer (LanceDB)                               │
│  ├── Document Embeddings                                    │
│  ├── Chunk Management (分片管理)                             │
│  └── Index Optimization (HNSW)                              │
└─────────────────────────────────────────────────────────────┘
```

#### RAG 流程设计
```typescript
interface RAGPipeline {
  // 1. 查询理解
  async understandQuery(query: string): Promise<{
    intent: 'factual' | 'creative' | 'analytical'
    entities: string[]
    rewrittenQueries: string[]
  }>
  
  // 2. 混合检索
  async hybridRetrieve(
    query: string,
    options: { topK: number, filters?: Filter }
  ): Promise<RetrievalResult[]>
  
  // 3. 重排序
  async rerank(
    query: string,
    candidates: RetrievalResult[]
  ): Promise<RerankedResult[]>
  
  // 4. 上下文组装
  async assembleContext(
    results: RerankedResult[],
    maxTokens: number
  ): Promise<ContextWindow>
  
  // 5. 生成回答
  async generate(
    query: string,
    context: ContextWindow
  ): Promise<GeneratedResponse>
}
```

### 2.3 图谱引擎 (Graph Engine)

#### 图数据模型
```typescript
interface GraphSchema {
  // 节点 (来自文档、块、标签等)
  nodes: {
    id: string
    type: 'document' | 'block' | 'tag' | 'entity'
    label: string
    properties: {
      createdAt: Date
      updatedAt: Date
      importance: number
      content?: string
      // ... 其他元数据
    }
  }
  
  // 边 (链接、引用、语义关联等)
  edges: {
    id: string
    source: string
    target: string
    type: 'link' | 'reference' | 'similar' | 'semantic'
    weight: number
    properties: {
      createdAt: Date
      context?: string
    }
  }
}
```

#### 存储与计算
- **存储**: 使用 SQLite 存储图结构，内存中构建邻接表
- **布局算法**: ForceAtlas2 (力导向) + 层次布局可选
- **社区发现**: Louvain 算法自动聚类
- **路径分析**: BFS/DFS + 权重最短路径

### 2.4 搜索引擎 (Search Engine)

#### 混合搜索架构
```
Query Input
     │
     ├─→ BM25 Search (Tantivy) ─┐
     │                           ├──→ Fusion (RRF) ─→ Rerank ─→ Results
     └─→ Vector Search (LanceDB) ─┘
     │
     └─→ Graph Traversal (邻居扩展) ─┘
```

#### 索引策略
```typescript
interface SearchIndex {
  // Tantivy 全文索引
  fullText: {
    fields: ['title', 'content', 'path']
    tokenizer: 'jieba' | 'cangjie'  // 中文分词
    filters: ['lowercase', 'stemming']
  }
  
  // 向量索引
  vector: {
    model: 'bge-m3'
    dimensions: 1024
    metric: 'cosine'
    indexType: 'HNSW'
  }
  
  // 图索引 (内存构建)
  graph: {
    adjacencyList: Map<string, Set<string>>
    edgeWeights: Map<string, number>
  }
}
```

### 2.5 同步引擎 (Sync Engine)

#### 同步策略
```typescript
interface SyncStrategy {
  // 本地优先策略
  type: 'local-first'
  
  // CRDT 数据结构
  document: Y.Doc  // Yjs CRDT
  
  // 同步模式
  modes: {
    // P2P 同步 (局域网)
    p2p: WebRTC + PeerJS
    
    // 云端同步 (可选)
    cloud: {
      protocol: 'E2EE'  // 端到端加密
      storage: 'S3-compatible'
      conflictResolution: 'CRDT-auto'
    }
    
    // Git 同步 (开发者友好)
    git: {
      autoCommit: boolean
      remote: string
    }
  }
}
```

---

## 3. 数据模型

### 3.1 核心实体关系

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Workspace  │◄──────┤  Knowledge  │◄──────┤  Document   │
│             │  1:M  │    Base     │  1:M  │             │
└─────────────┘       └─────────────┘       └──────┬──────┘
                                                   │
                          ┌────────────────────────┼────────┐
                          │                        │        │
                   ┌──────▼──────┐        ┌────────▼───┐   ┌▼─────────┐
                   │    Block    │◄───────┤  Revision  │   │  Comment │
                   │             │  1:M   │            │   │          │
                   └──────┬──────┘        └────────────┘   └──────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
   ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
   │   Link      │ │    Tag      │ │  Property   │
   │             │ │             │ │             │
   └─────────────┘ └─────────────┘ └─────────────┘
```

### 3.2 数据库 Schema

详见 [DATA_MODEL.md](./DATA_MODEL.md)

---

## 4. API 设计

### 4.1 内部 API (Core ↔ UI)

```typescript
// 命令式 API 设计
interface CoreAPI {
  // 文档操作
  document: {
    create(params: CreateDocParams): Promise<Document>
    get(id: string): Promise<Document | null>
    update(id: string, changes: Partial<Document>): Promise<void>
    delete(id: string): Promise<void>
    list(filter: DocFilter): Promise<Document[]>
  }
  
  // 块操作
  block: {
    insert(docId: string, pos: number, block: Block): Promise<void>
    update(docId: string, blockId: string, changes: Partial<Block>): Promise<void>
    delete(docId: string, blockId: string): Promise<void>
    move(docId: string, blockId: string, newPos: number): Promise<void>
  }
  
  // 搜索
  search: {
    query(q: string, options: SearchOptions): Promise<SearchResult[]>
    suggest(partial: string): Promise<string[]>
  }
  
  // AI
  ai: {
    complete(context: CompletionContext): AsyncIterable<Token>
    embed(text: string): Promise<number[]>
    chat(messages: Message[]): AsyncIterable<Token>
  }
  
  // 图谱
  graph: {
    getGlobal(): Promise<GraphData>
    getLocal(docId: string, depth: number): Promise<GraphData>
    findPath(from: string, to: string): Promise<string[]>
  }
}
```

### 4.2 插件 API

```typescript
interface PluginAPI {
  // 注册块类型
  registerBlockType(config: BlockTypeConfig): void
  
  // 注册命令
  registerCommand(command: Command): void
  
  // 注册视图
  registerView(view: ViewConfig): void
  
  // 监听事件
  on(event: string, handler: Function): void
  
  // 存储数据
  storage: {
    get(key: string): Promise<any>
    set(key: string, value: any): Promise<void>
  }
}
```

---

## 5. 安全架构

### 5.1 数据安全
```
本地存储:
├── SQLite 数据库文件 → AES-256-GCM 加密
├── 配置文件 → OS Keychain / Credential Manager
├── 缓存数据 → 内存优先，敏感数据不落盘
└── 备份文件 → 加密 ZIP

云端同步 (可选):
├── 客户端加密 (AES-256)
├── 服务端零知识 (无法解密)
└── TLS 1.3 传输加密
```

### 5.2 权限模型
```typescript
interface PermissionModel {
  // 角色定义
  roles: {
    owner: ['create', 'read', 'update', 'delete', 'admin']
    admin: ['create', 'read', 'update', 'delete', 'invite']
    editor: ['create', 'read', 'update', 'delete']
    commenter: ['read', 'comment']
    viewer: ['read']
  }
  
  // 资源层级
  resources: ['workspace', 'knowledgeBase', 'document', 'block']
  
  // 继承关系
  inheritance: 'workspace → knowledgeBase → document'
}
```

---

## 6. 性能优化策略

### 6.1 渲染优化
- **虚拟滚动**: 长文档只渲染可视区域
- **增量更新**: ProseMirror 事务合并
- **Web Worker**: 复杂计算移出主线程
- **WASM**: 计算密集型任务 (搜索、AI)

### 6.2 存储优化
- **增量索引**: 只索引变更内容
- **分层缓存**: L1 (内存) → L2 (IndexedDB) → L3 (文件)
- **压缩**: Snappy 压缩存储
- **垃圾回收**: 自动清理过期缓存

### 6.3 AI 优化
- **模型量化**: INT8/INT4 量化减少显存
- **批处理**: 嵌入请求批量处理
- **缓存**: 相似查询结果缓存
- **流式**: 大模型响应流式输出

---

## 7. 部署架构

### 7.1 桌面端
```
Tauri App
├── Rust Core (编译为二进制)
│   ├── SQLite (嵌入)
│   ├── AI Runtime (candle/ort)
│   └── File System Access
├── WebView (系统原生)
│   └── React UI (内嵌)
└── Resources
    ├── AI Models (按需下载)
    └── Templates
```

### 7.2 服务端 (可选云服务)
```
Cloud Services (Rust/Tokio)
├── API Gateway
├── Collaboration Server (WebSocket)
├── Sync Server (S3 兼容存储)
└── AI Proxy (请求转发、限流)
```

---

## 8. 监控与可观测性

### 8.1 本地遥测 (可选)
```typescript
interface Telemetry {
  // 性能指标
  performance: {
    documentLoadTime: Histogram
    searchLatency: Histogram
    aiResponseTime: Histogram
  }
  
  // 使用统计 (匿名)
  usage: {
    featureUsage: Counter
    errorRate: Counter
  }
}
```

### 8.2 日志系统
- 分级日志: ERROR > WARN > INFO > DEBUG
- 日志轮转: 自动清理旧日志
- 崩溃报告: 可选上传匿名崩溃信息
