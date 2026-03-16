use tauri::State;
use crate::AppState;
use crate::error::Result;
use crate::search::SearchResult;

#[tauri::command]
#[specta::specta]
pub async fn full_text_search(
    state: State<'_, AppState>,
    query: String,
    kb_id: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<SearchResult>> {
    let search_engine = &state.search_engine;
    let limit = limit.unwrap_or(20);
    
    search_engine.search(&query, kb_id.as_deref(), limit)
}

#[tauri::command]
#[specta::specta]
pub async fn semantic_search(
    _state: State<'_, AppState>,
    _query: String,
    _kb_id: Option<String>,
) -> Result<Vec<SearchResult>> {
    // TODO: 集成向量搜索 (LanceDB)
    // 目前返回空结果
    Ok(vec![])
}

#[tauri::command]
#[specta::specta]
pub async fn reindex_document(
    state: State<'_, AppState>,
    doc_id: String,
) -> Result<()> {
    // 获取文档
    let doc = state.db_pool.get_document(&doc_id)?;
    
    // 获取文档内容
    let kb_path = state.db_pool.get_kb_storage_path(&doc.kb_id)?;
    let content = crate::fs::read_document(kb_path.join(&doc.file_path))?;
    
    // 更新索引
    state.search_engine.index_document(&doc, &content)?;
    
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn remove_from_index(
    state: State<'_, AppState>,
    doc_id: String,
) -> Result<()> {
    state.search_engine.remove_document(&doc_id)?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn rebuild_search_index(
    state: State<'_, AppState>,
) -> Result<()> {
    state.search_engine.rebuild_index(state.db_pool.clone())?;
    Ok(())
}
