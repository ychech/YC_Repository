use std::path::PathBuf;
use rusqlite::{Connection, params};
use crate::error::{Result, AppError};
use crate::models::*;
use chrono::{DateTime, Utc};

pub mod migrations;

pub struct Database {
    pub(crate) conn: std::sync::Mutex<Connection>,
}

impl Database {
    pub async fn init() -> Result<Self> {
        let data_dir = Self::get_data_dir()?;
        std::fs::create_dir_all(&data_dir)?;
        
        let db_path = data_dir.join("mindnest.db");
        let conn = Connection::open(&db_path)?;
        
        // 启用外键约束
        conn.execute("PRAGMA foreign_keys = ON", [])?;
        
        // 性能优化 - 使用 query_row 因为 PRAGMA 可能返回结果
        let _journal_mode: String = conn.query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0))?;
        conn.execute("PRAGMA synchronous = NORMAL", [])?;
        conn.execute("PRAGMA cache_size = -64000", [])?;
        
        let db = Self {
            conn: std::sync::Mutex::new(conn),
        };
        
        // 运行迁移
        db.run_migrations()?;
        
        // 初始化默认数据
        db.seed_default_data()?;
        
        Ok(db)
    }
    
    /// 初始化默认工作区和知识库
    fn seed_default_data(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();
        
        // 检查是否已有工作区
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM workspaces",
            [],
            |row| row.get(0),
        )?;
        
        if count == 0 {
            // 创建默认工作区
            conn.execute(
                "INSERT INTO workspaces (id, name, owner_id, icon, settings, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![
                    "default_workspace",
                    "我的工作区",
                    "local_user",
                    "🏢",
                    "{}",
                    now,
                    now
                ],
            )?;
            
            // 创建默认知识库
            let kb_path = Self::get_data_dir()?.join("knowledge_bases").join("default_kb");
            std::fs::create_dir_all(&kb_path)?;
            
            conn.execute(
                "INSERT INTO knowledge_bases (id, workspace_id, name, description, icon, storage_path, settings, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                rusqlite::params![
                    "default_kb",
                    "default_workspace",
                    "默认知识库",
                    "系统自动创建的默认知识库",
                    "📚",
                    kb_path.to_string_lossy().to_string(),
                    "{}",
                    now,
                    now
                ],
            )?;
        }
        
        Ok(())
    }
    
    fn get_data_dir() -> Result<PathBuf> {
        let home = dirs::data_dir()
            .ok_or_else(|| AppError::Io("Cannot find data directory".to_string()))?;
        Ok(home.join("MindNest"))
    }
    
    fn run_migrations(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        migrations::run_all(&conn)?;
        Ok(())
    }
    
    pub fn create_knowledge_base(&self, kb: &KnowledgeBase) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO knowledge_bases (id, workspace_id, name, description, icon, color, storage_path, settings)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                kb.id, kb.workspace_id, kb.name, kb.description,
                kb.icon, kb.color, kb.storage_path, kb.settings
            ],
        )?;
        Ok(())
    }
    
    pub fn get_knowledge_base(&self, id: &str) -> Result<KnowledgeBase> {
        let conn = self.conn.lock().unwrap();
        let kb = conn.query_row(
            "SELECT id, workspace_id, name, description, icon, color, storage_path, settings, created_at, updated_at
             FROM knowledge_bases WHERE id = ?1",
            [id],
            |row| Ok(KnowledgeBase {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                icon: row.get(4)?,
                color: row.get(5)?,
                storage_path: row.get(6)?,
                settings: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            }),
        )?;
        Ok(kb)
    }
    
    pub fn list_knowledge_bases(&self, workspace_id: &str) -> Result<Vec<KnowledgeBase>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, workspace_id, name, description, icon, color, storage_path, settings, created_at, updated_at
             FROM knowledge_bases WHERE workspace_id = ?1 ORDER BY updated_at DESC"
        )?;
        
        let kbs = stmt.query_map([workspace_id], |row| {
            Ok(KnowledgeBase {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                icon: row.get(4)?,
                color: row.get(5)?,
                storage_path: row.get(6)?,
                settings: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
        
        Ok(kbs)
    }
    
    pub fn create_document(&self, doc: &Document) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let status = doc.status.to_string().to_lowercase();
        let content_type = doc.content_type.as_str();
        
        conn.execute(
            "INSERT INTO documents (
                id, kb_id, parent_id, title, slug, content_type, file_path, 
                file_size, checksum, version, frontmatter, word_count, 
                reading_time, status, is_pinned, is_favorite
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
            params![
                doc.id, doc.kb_id, doc.parent_id, doc.title, doc.slug,
                content_type, doc.file_path, doc.file_size, doc.checksum,
                doc.version, doc.frontmatter, doc.word_count, doc.reading_time,
                status, doc.is_pinned, doc.is_favorite
            ],
        )?;
        Ok(())
    }
    
    pub fn create_document_with_folder(&self, doc: &Document, folder_id: Option<&str>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let status = doc.status.to_string().to_lowercase();
        let content_type = doc.content_type.as_str();
        
        conn.execute(
            "INSERT INTO documents (
                id, kb_id, parent_id, folder_id, title, slug, content_type, file_path, 
                file_size, checksum, version, frontmatter, word_count, 
                reading_time, status, is_pinned, is_favorite
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
            params![
                doc.id, doc.kb_id, doc.parent_id, folder_id, doc.title, doc.slug,
                content_type, doc.file_path, doc.file_size, doc.checksum,
                doc.version, doc.frontmatter, doc.word_count, doc.reading_time,
                status, doc.is_pinned, doc.is_favorite
            ],
        )?;
        Ok(())
    }
    
    pub fn get_document(&self, id: &str) -> Result<Document> {
        let conn = self.conn.lock().unwrap();
        let doc = conn.query_row(
            "SELECT id, kb_id, parent_id, folder_id, title, slug, content_type, file_path,
                    file_size, checksum, version, frontmatter, word_count,
                    reading_time, status, is_pinned, is_favorite, created_at, updated_at
             FROM documents WHERE id = ?1",
            [id],
            |row| self.map_document_row(row),
        )?;
        Ok(doc)
    }
    
    fn map_summary_row(row: &rusqlite::Row) -> std::result::Result<DocumentSummary, rusqlite::Error> {
        Ok(DocumentSummary {
            id: row.get(0)?,
            kb_id: row.get(1)?,
            parent_id: row.get(2)?,
            folder_id: row.get(3)?,  // folder_id
            title: row.get(4)?,
            content_type: match row.get::<_, String>(5)?.as_str() {
                "database" => ContentType::Database,
                "canvas" => ContentType::Canvas,
                _ => ContentType::Markdown,
            },
            word_count: row.get(6)?,
            is_pinned: row.get(7)?,
            is_favorite: row.get(8)?,
            updated_at: row.get(9)?,
        })
    }

    pub fn list_documents(&self, kb_id: &str, parent_id: Option<&str>) -> Result<Vec<DocumentSummary>> {
        let conn = self.conn.lock().unwrap();
        
        let mut docs = Vec::new();
        
        if let Some(pid) = parent_id {
            let mut stmt = conn.prepare(
                "SELECT id, kb_id, parent_id, folder_id, title, content_type, word_count, is_pinned, is_favorite, updated_at
                 FROM documents WHERE kb_id = ?1 AND parent_id = ?2 AND status = 'active'
                 ORDER BY is_pinned DESC, updated_at DESC"
            )?;
            let mut rows = stmt.query([kb_id, pid])?;
            while let Some(row) = rows.next()? {
                docs.push(Self::map_summary_row(row)?);
            }
        } else {
            let mut stmt = conn.prepare(
                "SELECT id, kb_id, parent_id, folder_id, title, content_type, word_count, is_pinned, is_favorite, updated_at
                 FROM documents WHERE kb_id = ?1 AND parent_id IS NULL AND status = 'active'
                 ORDER BY is_pinned DESC, updated_at DESC"
            )?;
            let mut rows = stmt.query([kb_id])?;
            while let Some(row) = rows.next()? {
                docs.push(Self::map_summary_row(row)?);
            }
        };
        
        Ok(docs)
    }
    
    pub fn get_backlinks(&self, doc_id: &str) -> Result<Vec<Link>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, source_doc_id, source_block_id, target_doc_id, target_block_id,
                    link_text, context, type, created_at
             FROM links WHERE target_doc_id = ?1"
        )?;
        
        let links = stmt.query_map([doc_id], |row| {
            Ok(Link {
                id: row.get(0)?,
                source_doc_id: row.get(1)?,
                source_block_id: row.get(2)?,
                target_doc_id: row.get(3)?,
                target_block_id: row.get(4)?,
                link_text: row.get(5)?,
                context: row.get(6)?,
                link_type: match row.get::<_, String>(7)?.as_str() {
                    "embed" => LinkType::Embed,
                    "backlink" => LinkType::Backlink,
                    "reference" => LinkType::Reference,
                    _ => LinkType::Mention,
                },
                created_at: row.get(8)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
        
        Ok(links)
    }
    
    pub fn update_document(&self, doc: &Document) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let status = doc.status.to_string().to_lowercase();
        let content_type = doc.content_type.as_str();
        
        conn.execute(
            "UPDATE documents SET
                title = ?1, slug = ?2, content_type = ?3, file_path = ?4,
                file_size = ?5, checksum = ?6, version = ?7, frontmatter = ?8,
                word_count = ?9, reading_time = ?10, status = ?11,
                is_pinned = ?12, is_favorite = ?13, updated_at = ?14
             WHERE id = ?15",
            params![
                doc.title, doc.slug, content_type, doc.file_path,
                doc.file_size, doc.checksum, doc.version, doc.frontmatter,
                doc.word_count, doc.reading_time, status,
                doc.is_pinned, doc.is_favorite, doc.updated_at, doc.id
            ],
        )?;
        Ok(())
    }
    
    pub fn delete_document(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE documents SET status = 'deleted', updated_at = ?1 WHERE id = ?2",
            params![chrono::Utc::now(), id],
        )?;
        Ok(())
    }
    
    fn map_document_row(&self, row: &rusqlite::Row) -> std::result::Result<Document, rusqlite::Error> {
        Ok(Document {
            id: row.get(0)?,
            kb_id: row.get(1)?,
            parent_id: row.get(2)?,
            folder_id: row.get(3)?,  // folder_id
            title: row.get(4)?,
            slug: row.get(5)?,
            content_type: match row.get::<_, String>(6)?.as_str() {
                "database" => ContentType::Database,
                "canvas" => ContentType::Canvas,
                _ => ContentType::Markdown,
            },
            file_path: row.get(7)?,
            file_size: row.get(8)?,
            checksum: row.get(9)?,
            version: row.get(10)?,
            frontmatter: row.get(11)?,
            word_count: row.get(12)?,
            reading_time: row.get(13)?,
            status: match row.get::<_, String>(14)?.as_str() {
                "archived" => DocumentStatus::Archived,
                "deleted" => DocumentStatus::Deleted,
                _ => DocumentStatus::Active,
            },
            is_pinned: row.get(15)?,
            is_favorite: row.get(16)?,
            created_at: row.get(17)?,
            updated_at: row.get(17)?,
            tags: vec![],
            links: vec![],
        })
    }
    
    /// 获取知识库的存储路径
    pub fn get_kb_storage_path(&self, kb_id: &str) -> Result<PathBuf> {
        let conn = self.conn.lock().unwrap();
        let path: String = conn.query_row(
            "SELECT storage_path FROM knowledge_bases WHERE id = ?1",
            [kb_id],
            |row| row.get(0),
        )?;
        Ok(PathBuf::from(path))
    }
    
    // ==================== 文件夹操作 ====================
    
    pub fn create_folder(&self, folder: &Folder) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO folders (id, kb_id, parent_id, name, icon, color, position, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                folder.id, folder.kb_id, folder.parent_id, folder.name,
                folder.icon, folder.color, folder.position,
                folder.created_at.to_rfc3339(), folder.updated_at.to_rfc3339()
            ],
        )?;
        Ok(())
    }
    
    pub fn list_folders(&self, kb_id: &str) -> Result<Vec<Folder>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, kb_id, parent_id, name, icon, color, position, created_at, updated_at
             FROM folders WHERE kb_id = ?1 ORDER BY position, created_at"
        )?;
        
        let folders = stmt.query_map([kb_id], |row| {
            Ok(Folder {
                id: row.get(0)?,
                kb_id: row.get(1)?,
                parent_id: row.get(2)?,
                name: row.get(3)?,
                icon: row.get(4)?,
                color: row.get(5)?,
                position: row.get(6)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                    .map(|d| d.with_timezone(&Utc)).unwrap_or_else(|_| Utc::now()),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(8)?)
                    .map(|d| d.with_timezone(&Utc)).unwrap_or_else(|_| Utc::now()),
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
        
        Ok(folders)
    }
    
    pub fn update_folder(&self, folder: &Folder) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE folders SET name = ?1, icon = ?2, color = ?3, position = ?4, updated_at = ?5
             WHERE id = ?6",
            params![
                folder.name, folder.icon, folder.color, folder.position,
                folder.updated_at.to_rfc3339(), folder.id
            ],
        )?;
        Ok(())
    }
    
    pub fn delete_folder(&self, folder_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        // 先将文件夹内的文档设置为未分组
        conn.execute(
            "UPDATE documents SET folder_id = NULL, updated_at = ?1 WHERE folder_id = ?2",
            params![Utc::now().to_rfc3339(), folder_id],
        )?;
        // 再删除文件夹
        conn.execute("DELETE FROM folders WHERE id = ?1", [folder_id])?;
        Ok(())
    }
    
    pub fn move_document_to_folder(&self, doc_id: &str, folder_id: Option<&str>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE documents SET folder_id = ?1, updated_at = ?2 WHERE id = ?3",
            params![folder_id, Utc::now().to_rfc3339(), doc_id],
        )?;
        Ok(())
    }
    
    pub fn list_documents_by_folder(&self, kb_id: &str, folder_id: Option<&str>) -> Result<Vec<DocumentSummary>> {
        let conn = self.conn.lock().unwrap();
        
        let mut docs = Vec::new();
        
        if let Some(fid) = folder_id {
            let mut stmt = conn.prepare(
                "SELECT id, kb_id, parent_id, folder_id, title, content_type, word_count, is_pinned, is_favorite, updated_at
                 FROM documents WHERE kb_id = ?1 AND folder_id = ?2 AND status = 'active'
                 ORDER BY is_pinned DESC, updated_at DESC"
            )?;
            let mut rows = stmt.query([kb_id, fid])?;
            while let Some(row) = rows.next()? {
                docs.push(Self::map_summary_row(row)?);
            }
        } else {
            let mut stmt = conn.prepare(
                "SELECT id, kb_id, parent_id, folder_id, title, content_type, word_count, is_pinned, is_favorite, updated_at
                 FROM documents WHERE kb_id = ?1 AND folder_id IS NULL AND status = 'active'
                 ORDER BY is_pinned DESC, updated_at DESC"
            )?;
            let mut rows = stmt.query([kb_id])?;
            while let Some(row) = rows.next()? {
                docs.push(Self::map_summary_row(row)?);
            }
        };
        
        Ok(docs)
    }
}
