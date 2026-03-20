use tauri::State;
use crate::AppState;
use crate::error::Result;
use crate::models::*;

#[tauri::command]
#[specta::specta]
pub async fn get_linked_documents(
    _state: State<'_, AppState>,
    _doc_id: String,
) -> Result<Vec<DocumentSummary>> {
    // TODO: 实现
    Ok(vec![])
}

#[tauri::command]
#[specta::specta]
pub async fn get_backlinks(
    state: State<'_, AppState>,
    doc_id: String,
) -> Result<Vec<Link>> {
    state.db_pool.get_backlinks(&doc_id)
}
