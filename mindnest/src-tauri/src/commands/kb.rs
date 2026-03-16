use tauri::State;
use crate::AppState;
use crate::error::Result;
use crate::models::*;

#[tauri::command]
#[specta::specta]
pub async fn create_knowledge_base(
    state: State<'_, AppState>,
    workspace_id: String,
    name: String,
    description: Option<String>,
    icon: Option<String>,
) -> Result<KnowledgeBase> {
    let id = nanoid::nanoid!();
    let now = chrono::Utc::now();
    
    let kb = KnowledgeBase {
        id: id.clone(),
        workspace_id,
        name,
        description,
        icon: icon.unwrap_or_else(|| "📚".to_string()),
        color: None,
        storage_path: format!("knowledge_bases/{}", id),
        settings: serde_json::json!({}),
        created_at: now,
        updated_at: now,
    };
    
    state.db_pool.create_knowledge_base(&kb)?;
    
    Ok(kb)
}

#[tauri::command]
#[specta::specta]
pub async fn get_knowledge_base(
    state: State<'_, AppState>,
    id: String,
) -> Result<KnowledgeBase> {
    state.db_pool.get_knowledge_base(&id)
}

#[tauri::command]
#[specta::specta]
pub async fn list_knowledge_bases(
    state: State<'_, AppState>,
    workspace_id: String,
) -> Result<Vec<KnowledgeBase>> {
    state.db_pool.list_knowledge_bases(&workspace_id)
}

// ==================== 文件夹命令 ====================

#[tauri::command]
#[specta::specta]
pub async fn create_folder(
    state: State<'_, AppState>,
    kb_id: String,
    name: String,
    parent_id: Option<String>,
    icon: Option<String>,
) -> Result<Folder> {
    let id = nanoid::nanoid!();
    let now = chrono::Utc::now();
    
    let folder = Folder {
        id: id.clone(),
        kb_id,
        parent_id,
        name,
        icon: icon.unwrap_or_else(|| "📁".to_string()),
        color: None,
        position: 0,
        created_at: now,
        updated_at: now,
    };
    
    state.db_pool.create_folder(&folder)?;
    
    Ok(folder)
}

#[tauri::command]
#[specta::specta]
pub async fn list_folders(
    state: State<'_, AppState>,
    kb_id: String,
) -> Result<Vec<Folder>> {
    state.db_pool.list_folders(&kb_id)
}

#[tauri::command]
#[specta::specta]
pub async fn update_folder(
    state: State<'_, AppState>,
    folder: Folder,
) -> Result<Folder> {
    state.db_pool.update_folder(&folder)?;
    Ok(folder)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_folder(
    state: State<'_, AppState>,
    id: String,
) -> Result<()> {
    state.db_pool.delete_folder(&id)
}
