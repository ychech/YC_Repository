use tauri::State;
use crate::AppState;
use crate::error::Result;
use crate::models::*;
use crate::fs;
use std::path::PathBuf;

#[tauri::command]
#[specta::specta]
pub async fn create_document(
    state: State<'_, AppState>,
    kb_id: String,
    title: String,
    content: Option<String>,
    parent_id: Option<String>,
    folder_id: Option<String>,
) -> Result<Document> {
    let id = nanoid::nanoid!();
    let now = chrono::Utc::now();
    
    // 生成文件路径
    let kb_path = state.db_pool.get_kb_storage_path(&kb_id)?;
    let file_path = format!("{}.md", id);
    let full_path = kb_path.join(&file_path);
    
    // 如果有内容，写入文件
    let (checksum, file_size, word_count, reading_time) = if let Some(ref content) = content {
        fs::write_document(&full_path, content)?;
        let checksum = fs::calculate_checksum(content);
        let file_size = content.len() as i64;
        let word_count = fs::count_words(content);
        let reading_time = fs::estimate_reading_time(word_count);
        (Some(checksum), file_size, word_count, reading_time)
    } else {
        (None, 0, 0, 0)
    };
    
    let doc = Document {
        id: id.clone(),
        kb_id: kb_id.clone(),
        parent_id,
        folder_id: folder_id.clone(),  // 设置 folder_id
        title: title.clone(),
        slug: Some(fs::generate_slug(&title)),
        content_type: ContentType::Markdown,
        file_path,
        file_size,
        checksum,
        version: 1,
        frontmatter: serde_json::json!({
            "title": title,
            "created_at": now,
        }),
        word_count,
        reading_time,
        status: DocumentStatus::Active,
        is_pinned: false,
        is_favorite: false,
        tags: vec![],
        links: vec![],
        created_at: now,
        updated_at: now,
    };
    
    state.db_pool.create_document_with_folder(&doc, folder_id.as_deref())?;
    
    Ok(doc)
}

#[tauri::command]
#[specta::specta]
pub async fn get_document(
    state: State<'_, AppState>,
    id: String,
) -> Result<Document> {
    state.db_pool.get_document(&id)
}

/// 获取文档内容
#[tauri::command]
#[specta::specta]
pub async fn get_document_content(
    state: State<'_, AppState>,
    id: String,
) -> Result<String> {
    let doc = state.db_pool.get_document(&id)?;
    let kb_path = state.db_pool.get_kb_storage_path(&doc.kb_id)?;
    let full_path = kb_path.join(&doc.file_path);
    
    if !full_path.exists() {
        return Ok(String::new());
    }
    
    fs::read_document(full_path)
}

#[tauri::command]
#[specta::specta]
pub async fn update_document(
    state: State<'_, AppState>,
    id: String,
    title: Option<String>,
    content: Option<String>,
) -> Result<Document> {
    let mut doc = state.db_pool.get_document(&id)?;
    let now = chrono::Utc::now();
    
    // 更新标题
    if let Some(new_title) = title {
        doc.title = new_title.clone();
        doc.slug = Some(fs::generate_slug(&new_title));
    }
    
    // 更新内容
    if let Some(new_content) = content {
        let kb_path = state.db_pool.get_kb_storage_path(&doc.kb_id)?;
        let full_path = kb_path.join(&doc.file_path);
        
        // 写入文件
        fs::write_document(&full_path, &new_content)?;
        
        // 更新元数据
        doc.checksum = Some(fs::calculate_checksum(&new_content));
        doc.file_size = new_content.len() as i64;
        doc.word_count = fs::count_words(&new_content);
        doc.reading_time = fs::estimate_reading_time(doc.word_count);
    }
    
    // 更新版本和时间
    doc.version += 1;
    doc.updated_at = now;
    
    // 保存到数据库
    state.db_pool.update_document(&doc)?;
    
    Ok(doc)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_document(
    state: State<'_, AppState>,
    id: String,
) -> Result<()> {
    state.db_pool.delete_document(&id)
}

#[tauri::command]
#[specta::specta]
pub async fn move_document(
    state: State<'_, AppState>,
    id: String,
    parent_id: Option<String>,
    folder_id: Option<String>,
) -> Result<Document> {
    let mut doc = state.db_pool.get_document(&id)?;
    let now = chrono::Utc::now();
    
    // 更新父ID（文档父子关系）和 folder_id（文件夹关联）
    if parent_id.is_some() {
        doc.parent_id = parent_id;
    }
    if folder_id.is_some() {
        doc.folder_id = folder_id;
    }
    doc.updated_at = now;
    
    // 保存到数据库
    state.db_pool.update_document(&doc)?;
    
    Ok(doc)
}

#[tauri::command]
#[specta::specta]
pub async fn list_documents(
    state: State<'_, AppState>,
    kb_id: String,
    parent_id: Option<String>,
    folder_id: Option<String>,
) -> Result<Vec<DocumentSummary>> {
    // 如果提供了 folder_id，使用 list_documents_by_folder
    if folder_id.is_some() {
        state.db_pool.list_documents_by_folder(&kb_id, folder_id.as_deref())
    } else {
        state.db_pool.list_documents(&kb_id, parent_id.as_deref())
    }
}

#[tauri::command]
#[specta::specta]
pub async fn search_documents(
    state: State<'_, AppState>,
    query: String,
    kb_id: Option<String>,
) -> Result<Vec<DocumentSummary>> {
    // TODO: 集成搜索引擎
    // 目前简单返回空列表
    Ok(vec![])
}
