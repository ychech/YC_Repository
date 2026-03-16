# 🧠 MindNest

> AI 原生的本地优先知识管理系统

<p align="center">
  <img src="./assets/logo.png" alt="MindNest Logo" width="120">
</p>

<p align="center">
  <a href="https://github.com/mindnest/mindnest/releases">
    <img src="https://img.shields.io/github/v/release/mindnest/mindnest" alt="Release">
  </a>
  <a href="https://github.com/mindnest/mindnest/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License">
  </a>
  <a href="https://discord.gg/mindnest">
    <img src="https://img.shields.io/discord/xxx?color=7289da&label=discord" alt="Discord">
  </a>
</p>

---

## ✨ 核心特性

### 🏠 本地优先，数据可控
- 所有数据本地存储，无需联网即可使用
- 端到端加密同步 (可选)
- 支持完全离线工作
- 数据随时导出，格式开放

### 🧩 块级编辑器
- Notion 风格的块级编辑体验
- 支持富文本、代码块、表格、看板
- Markdown 原生支持
- 双向链接 `[[维基链接]]`

### 🤖 AI 第二大脑
- **本地 AI**: 无需上传数据，保护隐私
- **智能搜索**: 语义检索，找到你忘记的知识
- **写作助手**: 智能续写、润色、摘要
- **知识洞察**: 自动发现关联，识别知识盲区

### 🕸️ 知识图谱
- 可视化你的知识网络
- 2D/3D 图谱探索
- 发现隐藏的知识关联
- 全局与局部视图

### 👥 团队协作
- 实时协同编辑 (CRDT)
- 团队知识库管理
- 评论与讨论
- 权限管理

---

## 🚀 快速开始

### 安装

#### macOS
```bash
brew install --cask mindnest
```

#### Windows
```powershell
winget install MindNest.MindNest
```

#### Linux
```bash
# AppImage
wget https://github.com/mindnest/mindnest/releases/latest/download/mindnest.AppImage
chmod +x mindnest.AppImage
./mindnest.AppImage
```

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/mindnest/mindnest.git
cd mindnest

# 安装依赖
pnpm install

# 运行开发版本
pnpm tauri dev

# 构建生产版本
pnpm tauri build
```

---

## 📸 界面预览

<p align="center">
  <img src="./assets/screenshot-editor.png" alt="Editor" width="800">
</p>

<p align="center">
  <img src="./assets/screenshot-graph.png" alt="Graph" width="800">
</p>

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **桌面端** | Tauri (Rust) + React |
| **编辑器** | TipTap / ProseMirror |
| **状态管理** | Zustand |
| **数据库** | SQLite |
| **向量搜索** | LanceDB |
| **全文搜索** | Tantivy |
| **本地 AI** | candle / llama.cpp |
| **样式** | Tailwind CSS |

---

## 📖 文档

- [产品需求文档 (PRD)](./docs/PRD.md)
- [技术架构](./docs/ARCHITECTURE.md)
- [数据模型](./docs/DATA_MODEL.md)
- [AI 系统设计](./docs/AI_SYSTEM.md)
- [商业化策略](./docs/BUSINESS.md)
- [MVP 启动指南](./docs/MVP_GUIDE.md)

---

## 🤝 贡献

我们欢迎所有形式的贡献！

### 贡献方式

- 🐛 [提交 Bug](https://github.com/mindnest/mindnest/issues)
- 💡 [功能建议](https://github.com/mindnest/mindnest/discussions)
- 📝 [改进文档](https://github.com/mindnest/mindnest/tree/main/docs)
- 💻 [提交代码](https://github.com/mindnest/mindnest/pulls)
- 🌍 [翻译](https://crowdin.com/project/mindnest)

### 开发流程

```bash
# 1. Fork 项目

# 2. 克隆你的 Fork
git clone https://github.com/YOUR_USERNAME/mindnest.git

# 3. 创建分支
git checkout -b feature/amazing-feature

# 4. 提交更改
git commit -m 'Add amazing feature'

# 5. 推送分支
git push origin feature/amazing-feature

# 6. 创建 Pull Request
```

---

## 📜 开源协议

本项目采用 **AGPL-3.0** 开源协议。

```
Copyright (C) 2024 MindNest Team

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License.
```

**商业授权**: 如果您需要在闭源商业产品中使用 MindNest，请联系我们获取商业授权。

---

## 🙏 致谢

感谢以下开源项目：

- [Tauri](https://tauri.app/) - 桌面应用框架
- [TipTap](https://tiptap.dev/) - 富文本编辑器
- [LanceDB](https://lancedb.github.io/) - 向量数据库
- [candle](https://github.com/huggingface/candle) - Rust ML 框架

---

## 💬 联系我们

- 📧 Email: hello@mindnest.app
- 🐦 Twitter: [@mindnest](https://twitter.com/mindnest)
- 💬 Discord: [Join our server](https://discord.gg/mindnest)
- 📱 微信: mindnest_official

---

<p align="center">
  Made with ❤️ by the MindNest Team
</p>

<p align="center">
  <a href="https://www.producthunt.com/posts/mindnest" target="_blank">
    <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=xxx&theme=light" alt="Product Hunt" width="200">
  </a>
</p>
