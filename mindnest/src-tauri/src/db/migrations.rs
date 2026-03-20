use rusqlite::Connection;
use crate::error::Result;

const MIGRATIONS: &[&str] = &[
    // Migration 001: Initial schema
    r#"
    -- 工作区
    CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        owner_id TEXT NOT NULL,
        icon TEXT,
        settings TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 知识库
    CREATE TABLE IF NOT EXISTS knowledge_bases (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT DEFAULT '📚',
        color TEXT,
        storage_path TEXT NOT NULL,
        settings TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_kb_workspace ON knowledge_bases(workspace_id);

    -- 文档
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        kb_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
        parent_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        slug TEXT,
        content_type TEXT DEFAULT 'markdown' CHECK(content_type IN ('markdown', 'database', 'canvas')),
        file_path TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        checksum TEXT,
        version INTEGER DEFAULT 1,
        frontmatter TEXT DEFAULT '{}',
        word_count INTEGER DEFAULT 0,
        reading_time INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'deleted')),
        is_pinned BOOLEAN DEFAULT FALSE,
        is_favorite BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_doc_kb ON documents(kb_id);
    CREATE INDEX IF NOT EXISTS idx_doc_parent ON documents(parent_id);
    CREATE INDEX IF NOT EXISTS idx_doc_status ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_doc_updated ON documents(updated_at);

    -- 块
    CREATE TABLE IF NOT EXISTS blocks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK(type IN (
            'paragraph', 'heading', 'code', 'quote', 
            'list_item', 'bullet_list', 'ordered_list',
            'table', 'image', 'embed', 'divider',
            'callout', 'ai_generated', 'math', 'mermaid'
        )),
        content TEXT NOT NULL,
        parent_id TEXT REFERENCES blocks(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        attrs TEXT DEFAULT '{}',
        ai_metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_block_doc ON blocks(document_id);
    CREATE INDEX IF NOT EXISTS idx_block_position ON blocks(document_id, position);

    -- 标签
    CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        kb_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#6366F1',
        icon TEXT,
        description TEXT,
        parent_id TEXT REFERENCES tags(id) ON DELETE SET NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(kb_id, name)
    );

    -- 文档-标签关联
    CREATE TABLE IF NOT EXISTS document_tags (
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (document_id, tag_id)
    );

    -- 链接
    CREATE TABLE IF NOT EXISTS links (
        id TEXT PRIMARY KEY,
        source_doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        source_block_id TEXT REFERENCES blocks(id) ON DELETE SET NULL,
        target_doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        target_block_id TEXT REFERENCES blocks(id) ON DELETE SET NULL,
        link_text TEXT,
        context TEXT,
        type TEXT DEFAULT 'mention' CHECK(type IN ('mention', 'embed', 'backlink', 'reference')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_link_source ON links(source_doc_id);
    CREATE INDEX IF NOT EXISTS idx_link_target ON links(target_doc_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_link_unique ON links(
        source_doc_id, target_doc_id, COALESCE(source_block_id, ''), COALESCE(target_block_id, '')
    );

    -- 版本历史
    CREATE TABLE IF NOT EXISTS revisions (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        parent_revision_id TEXT REFERENCES revisions(id),
        change_type TEXT CHECK(change_type IN ('full', 'delta')),
        content_snapshot TEXT,
        added_chars INTEGER DEFAULT 0,
        deleted_chars INTEGER DEFAULT 0,
        author_id TEXT,
        author_name TEXT,
        summary TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(document_id, version_number)
    );

    CREATE INDEX IF NOT EXISTS idx_revision_doc ON revisions(document_id);

    -- 评论
    CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        block_id TEXT REFERENCES blocks(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        anchor TEXT,
        parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
        author_id TEXT NOT NULL,
        author_name TEXT,
        author_avatar TEXT,
        status TEXT DEFAULT 'open' CHECK(status IN ('open', 'resolved')),
        resolved_at DATETIME,
        resolved_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_comment_doc ON comments(document_id);
    CREATE INDEX IF NOT EXISTS idx_comment_status ON comments(status);

    -- 用户设置
    CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        editor TEXT DEFAULT '{}',
        ai TEXT DEFAULT '{}',
        shortcuts TEXT DEFAULT '{}',
        privacy TEXT DEFAULT '{}',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 同步状态
    CREATE TABLE IF NOT EXISTS sync_status (
        id TEXT PRIMARY KEY,
        kb_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
        last_local_change_at DATETIME,
        local_cursor TEXT,
        remote_provider TEXT,
        remote_url TEXT,
        last_sync_at DATETIME,
        last_sync_error TEXT,
        sync_status TEXT CHECK(sync_status IN ('idle', 'syncing', 'error')),
        pending_conflicts INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 元数据表 (跟踪 schema 版本)
    CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    "#,
    
    // Migration 002: Add AI usage tracking
    r#"
    CREATE TABLE IF NOT EXISTS ai_usage (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        feature TEXT NOT NULL,
        model TEXT,
        tokens_input INTEGER DEFAULT 0,
        tokens_output INTEGER DEFAULT 0,
        latency_ms INTEGER,
        success BOOLEAN,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ai_usage_workspace ON ai_usage(workspace_id, feature, created_at);

    CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        title TEXT,
        context_doc_ids TEXT,
        messages TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    "#,
    
    // Migration 003: Add FTS5 virtual table for search (DISABLED - causing SQL logic errors)
    // FTS temporarily disabled to fix document update issues
    r#"
    -- FTS5 disabled until triggers can be fixed
    -- CREATE VIRTUAL TABLE IF NOT EXISTS document_fts USING fts5(title, content, tokenize = 'porter unicode61');
    "#,
    
    // Migration 004: Add folders table
    r#"
    -- 文件夹表
    CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        kb_id TEXT NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
        parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        icon TEXT DEFAULT '📁',
        color TEXT,
        position INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_folder_kb ON folders(kb_id);
    CREATE INDEX IF NOT EXISTS idx_folder_parent ON folders(parent_id);

    -- 添加文档的 folder_id 字段（用于关联文件夹）
    ALTER TABLE documents ADD COLUMN folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_doc_folder ON documents(folder_id);
    "#,
    
    // Migration 005: Remove FTS triggers that cause SQL logic errors
    r#"
    -- 删除有问题的 FTS 触发器
    DROP TRIGGER IF EXISTS documents_ai;
    DROP TRIGGER IF EXISTS documents_au;
    DROP TRIGGER IF EXISTS documents_ad;
    
    -- 删除 FTS 表（如果存在）
    DROP TABLE IF EXISTS document_fts;
    "#,
    
    // Migration 006: Simplify user_settings table structure
    // AI4: 修复设置存储格式混乱问题
    r#"
    -- 创建临时表存储现有数据
    CREATE TABLE IF NOT EXISTS _temp_settings AS
    SELECT user_id, editor as settings, updated_at 
    FROM user_settings 
    WHERE user_id = 'local_user';
    
    -- 删除旧表
    DROP TABLE IF EXISTS user_settings;
    
    -- 创建新表（简化结构）
    CREATE TABLE user_settings (
        user_id TEXT PRIMARY KEY,
        settings TEXT NOT NULL DEFAULT '{}',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- 迁移数据
    INSERT INTO user_settings (user_id, settings, updated_at)
    SELECT user_id, 
           COALESCE(settings, '{}'),
           COALESCE(updated_at, CURRENT_TIMESTAMP)
    FROM _temp_settings
    WHERE user_id IS NOT NULL;
    
    -- 删除临时表
    DROP TABLE IF EXISTS _temp_settings;
    "#,
];

pub fn run_all(conn: &Connection) -> Result<()> {
    // 创建 migrations 表（如果不存在）
    conn.execute(
        "CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    
    // 获取当前版本
    let current_version: i32 = conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM _migrations",
        [],
        |row| row.get(0),
    ).unwrap_or(0);
    
    // 运行待执行的迁移
    for (i, migration) in MIGRATIONS.iter().enumerate() {
        let version = (i + 1) as i32;
        if version > current_version {
            conn.execute_batch(migration)?;
            conn.execute(
                "INSERT INTO _migrations (version) VALUES (?1)",
                [version],
            )?;
        }
    }
    
    Ok(())
}
