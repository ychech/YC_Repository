// MindNest - AI-native local-first knowledge base
// Main entry point

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod error;
mod models;
mod search;
mod ai;
mod sync;
mod fs;

use std::sync::Arc;
use tauri::Manager;
use tracing::{info, error};

pub struct AppState {
    pub db_pool: Arc<db::Database>,
    pub search_engine: Arc<search::SearchEngine>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 初始化日志
    tracing_subscriber::fmt()
        .with_env_filter("info,mindnest=debug")
        .init();
    
    info!("Starting MindNest...");
    
    // 初始化数据库
    let db = Arc::new(db::Database::init().await?);
    info!("Database initialized");
    
    // 初始化搜索引擎
    let search = Arc::new(search::SearchEngine::new(Arc::clone(&db))?);
    info!("Search engine initialized");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .manage(AppState {
            db_pool: db,
            search_engine: search,
        })
        .setup(|app| {
            // 创建数据目录
            let app_data = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data)?;
            info!("App data directory: {:?}", app_data);
            
            // 显示主窗口
            info!("Setting up main window...");
            if let Some(window) = app.get_webview_window("main") {
                info!("Main window found, showing...");
                window.show()?;
                window.set_focus()?;
                window.center()?;
                info!("Main window should be visible now");
            } else {
                error!("Main window NOT found!");
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 文档操作
            commands::document::create_document,
            commands::document::get_document,
            commands::document::get_document_content,
            commands::document::update_document,
            commands::document::delete_document,
            commands::document::move_document,
            commands::document::list_documents,
            commands::document::list_all_documents,
            commands::document::search_documents,
            
            // 知识库操作
            commands::kb::create_knowledge_base,
            commands::kb::get_knowledge_base,
            commands::kb::list_knowledge_bases,
            
            // 文件夹操作
            commands::kb::create_folder,
            commands::kb::list_folders,
            commands::kb::update_folder,
            commands::kb::delete_folder,
            
            // 链接操作
            commands::link::get_linked_documents,
            commands::link::get_backlinks,
            
            // 搜索
            commands::search::full_text_search,
            commands::search::semantic_search,
            commands::search::reindex_document,
            commands::search::remove_from_index,
            commands::search::rebuild_search_index,
            
            // AI 操作
            commands::ai::generate_completion,
            commands::ai::chat_with_context,
            commands::ai::get_suggestions,
            commands::ai::continue_writing,
            commands::ai::polish_text,
            commands::ai::generate_summary,
            commands::ai::translate_text,
            commands::ai::generate_tags,
            commands::ai::find_similar_documents,
            
            // 系统
            commands::system::get_app_info,
            commands::system::open_settings,
            commands::system::open_data_directory,
            
            // 设置
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::reset_settings,
            commands::settings::export_settings,
            commands::settings::import_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    
    Ok(())
}
