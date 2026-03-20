use tauri::State;
use crate::AppState;
use crate::error::Result;
use crate::models::*;
use crate::fs;


#[tauri::command]
#[specta::specta]
pub async fn create_document(
    state: State<'_, AppState>,
    kb_id: String,
    title: String,
    content: Option<String>,
    parent_id: Option<String>,
    folder_id: Option<String>,
    content_type: Option<String>,  // 新增: 文档类型
) -> Result<Document> {
    let id = nanoid::nanoid!();
    let now = chrono::Utc::now();
    
    // 解析 content_type
    let content_type = match content_type.as_deref() {
        Some("canvas") => ContentType::Canvas,
        Some("database") => ContentType::Database,
        _ => ContentType::Markdown,
    };
    
    // 获取知识库的完整存储路径
    let kb_full_path = state.db_pool.get_kb_full_storage_path(&kb_id)?;
    
    // 文件路径（根据类型选择扩展名）
    let ext = match content_type {
        ContentType::Canvas => "canvas",
        ContentType::Database => "db",
        ContentType::Markdown => "md",
    };
    let file_path = format!("{}.{}", id, ext);
    let full_path = kb_full_path.join(&file_path);
    
    // 确保目录存在并写入文件
    let content_str = content.unwrap_or_default();
    fs::write_document(&full_path, &content_str)?;
    
    // 计算元数据
    let checksum = fs::calculate_checksum(&content_str);
    let file_size = content_str.len() as i64;
    let word_count = fs::count_words(&content_str);
    let reading_time = fs::estimate_reading_time(word_count);
    
    let doc = Document {
        id: id.clone(),
        kb_id: kb_id.clone(),
        parent_id,
        folder_id: folder_id.clone(),
        title: title.clone(),
        slug: Some(fs::generate_slug(&title)),
        content_type,
        file_path: file_path.clone(),
        file_size,
        checksum: Some(checksum),
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
        position: Some(0.0),
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
    let kb_full_path = state.db_pool.get_kb_full_storage_path(&doc.kb_id)?;
    let full_path = kb_full_path.join(&doc.file_path);
    
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
        let kb_full_path = state.db_pool.get_kb_full_storage_path(&doc.kb_id)?;
        let full_path = kb_full_path.join(&doc.file_path);
        
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
    position: Option<f64>,
) -> Result<Document> {
    let mut doc = state.db_pool.get_document(&id)?;
    let now = chrono::Utc::now();
    
    // 更新父ID（文档父子关系）
    if parent_id.is_some() {
        doc.parent_id = parent_id;
    }
    // 更新 folder_id（文件夹关联），允许设为 None（移出分组）
    doc.folder_id = folder_id.clone();
    doc.updated_at = now;
    
    // 更新 position（排序位置）
    if position.is_some() {
        doc.position = position;
    }
    
    // 保存到数据库 - 使用专门的移动方法处理 position
    state.db_pool.move_document_to_folder(&id, folder_id.as_deref(), position)?;
    
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
pub async fn list_all_documents(
    state: State<'_, AppState>,
    kb_id: String,
) -> Result<Vec<DocumentSummary>> {
    state.db_pool.list_all_documents(&kb_id)
}

#[tauri::command]
#[specta::specta]
pub async fn search_documents(
    _state: State<'_, AppState>,
    _query: String,
    _kb_id: Option<String>,
) -> Result<Vec<DocumentSummary>> {
    // TODO: 集成搜索引擎
    // 目前简单返回空列表
    Ok(vec![])
}
