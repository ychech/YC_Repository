use crate::error::{Result, AppError};
use serde_json::json;

#[tauri::command]
#[specta::specta]
pub async fn get_app_info() -> Result<serde_json::Value> {
    // 获取数据目录
    let data_dir = dirs::data_dir()
        .map(|p| p.join("MindNest"))
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "Unknown".to_string());
    
    Ok(json!({
        "name": "MindNest",
        "version": env!("CARGO_PKG_VERSION"),
        "description": env!("CARGO_PKG_DESCRIPTION"),
        "data_dir": data_dir,
    }))
}

#[tauri::command]
#[specta::specta]
pub async fn open_settings() -> Result<()> {
    // TODO: 打开设置
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn open_data_directory() -> Result<()> {
    use std::process::Command;
    
    let data_dir = dirs::data_dir()
        .ok_or_else(|| AppError::Io("Cannot find data directory".to_string()))?
        .join("MindNest");
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&data_dir)
            .spawn()
            .map_err(|e| AppError::Io(format!("Failed to open directory: {}", e)))?;
    }
    
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&data_dir)
            .spawn()
            .map_err(|e| AppError::Io(format!("Failed to open directory: {}", e)))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&data_dir)
            .spawn()
            .map_err(|e| AppError::Io(format!("Failed to open directory: {}", e)))?;
    }
    
    Ok(())
}
