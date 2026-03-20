use tauri::State;
use crate::AppState;
use crate::error::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

/// 应用设置结构
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub general: GeneralSettings,
    pub editor: EditorSettings,
    pub ai: AISettings,
    pub shortcuts: ShortcutSettings,
    pub privacy: PrivacySettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneralSettings {
    pub theme: String,
    pub language: String,
    pub startup_behavior: String,
    pub auto_save_interval: i32,
    pub show_line_numbers: bool,
    pub font_size: i32,
    pub font_family: String,
}

impl Default for GeneralSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            language: "zh-CN".to_string(),
            startup_behavior: "continue".to_string(),
            auto_save_interval: 30,
            show_line_numbers: false,
            font_size: 16,
            font_family: "system-ui, -apple-system, sans-serif".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditorSettings {
    pub word_wrap: String,
    pub tab_size: i32,
    pub use_spaces_for_tabs: bool,
    pub show_whitespace: bool,
    pub spell_check: bool,
    pub auto_brackets: bool,
    pub auto_quotes: bool,
    pub auto_format_paste: bool,
}

impl Default for EditorSettings {
    fn default() -> Self {
        Self {
            word_wrap: "soft".to_string(),
            tab_size: 2,
            use_spaces_for_tabs: true,
            show_whitespace: false,
            spell_check: true,
            auto_brackets: true,
            auto_quotes: true,
            auto_format_paste: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AISettings {
    pub enabled: bool,
    pub local_model_path: Option<String>,
    pub preferred_model: String,
    pub api_provider: String,
    pub api_key: Option<String>,
    pub api_base_url: Option<String>,
    pub default_temperature: f32,
    pub max_tokens: i32,
    pub suggestion_interval: i32,
    pub auto_completion: bool,
    pub smart_tags: bool,
    pub translate_target_language: String,
}

impl Default for AISettings {
    fn default() -> Self {
        Self {
            enabled: true,
            local_model_path: None,
            preferred_model: "gpt-4o-mini".to_string(),
            api_provider: "openai".to_string(),
            api_key: None,
            api_base_url: None,
            default_temperature: 0.7,
            max_tokens: 2000,
            suggestion_interval: 100,
            auto_completion: true,
            smart_tags: true,
            translate_target_language: "zh".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutSettings {
    pub save: String,
    pub new_document: String,
    pub search: String,
    pub command_palette: String,
    pub toggle_sidebar: String,
    pub toggle_preview: String,
    pub bold: String,
    pub italic: String,
    pub code: String,
    pub link: String,
}

impl Default for ShortcutSettings {
    fn default() -> Self {
        Self {
            save: "mod+s".to_string(),
            new_document: "mod+n".to_string(),
            search: "mod+k".to_string(),
            command_palette: "mod+shift+p".to_string(),
            toggle_sidebar: "mod+\\".to_string(),
            toggle_preview: "mod+e".to_string(),
            bold: "mod+b".to_string(),
            italic: "mod+i".to_string(),
            code: "mod+shift+c".to_string(),
            link: "mod+k".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivacySettings {
    pub enable_telemetry: bool,
    pub auto_check_updates: bool,
    pub crash_reporting: bool,
    pub e2ee_sync: bool,
    pub sync_provider: Option<String>,
}

impl Default for PrivacySettings {
    fn default() -> Self {
        Self {
            enable_telemetry: false,
            auto_check_updates: true,
            crash_reporting: true,
            e2ee_sync: false,
            sync_provider: None,
        }
    }
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            general: GeneralSettings::default(),
            editor: EditorSettings::default(),
            ai: AISettings::default(),
            shortcuts: ShortcutSettings::default(),
            privacy: PrivacySettings::default(),
        }
    }
}

impl AppSettings {
    pub fn from_json(value: JsonValue) -> Result<Self> {
        serde_json::from_value(value)
            .map_err(|e| crate::error::AppError::Serialization(e.to_string()))
    }
    
    pub fn to_json(&self) -> Result<JsonValue> {
        serde_json::to_value(self)
            .map_err(|e| crate::error::AppError::Serialization(e.to_string()))
    }
}

const SETTINGS_USER_ID: &str = "local_user";

/// 获取所有设置
#[tauri::command]
#[specta::specta]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings> {
    let conn = state.db_pool.conn.lock().unwrap();
    
    let result: Result<String> = conn.query_row(
        "SELECT settings FROM user_settings WHERE user_id = ?1",
        [SETTINGS_USER_ID],
        |row| row.get::<_, String>(0),
    ).map_err(|e| e.into());
    
    match result {
        Ok(json_str) => {
            let json: JsonValue = serde_json::from_str(&json_str)
                .map_err(|e| crate::error::AppError::Serialization(e.to_string()))?;
            AppSettings::from_json(json)
        }
        Err(_) => {
            Ok(AppSettings::default())
        }
    }
}

/// 更新设置
#[tauri::command]
#[specta::specta]
pub async fn update_settings(
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<AppSettings> {
    let json = settings.to_json()?;
    let json_str = json.to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    let conn = state.db_pool.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO user_settings (user_id, settings, updated_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(user_id) DO UPDATE SET
            settings = excluded.settings,
            updated_at = excluded.updated_at",
        rusqlite::params![SETTINGS_USER_ID, json_str, now],
    )?;
    
    Ok(settings)
}

/// 重置设置为默认值
#[tauri::command]
#[specta::specta]
pub async fn reset_settings(state: State<'_, AppState>) -> Result<AppSettings> {
    let default = AppSettings::default();
    let json = default.to_json()?;
    let json_str = json.to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    let conn = state.db_pool.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO user_settings (user_id, settings, updated_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(user_id) DO UPDATE SET
            settings = excluded.settings,
            updated_at = excluded.updated_at",
        rusqlite::params![SETTINGS_USER_ID, json_str, now],
    )?;
    
    Ok(default)
}

/// 导出设置
#[tauri::command]
#[specta::specta]
pub async fn export_settings(state: State<'_, AppState>) -> Result<String> {
    let settings = get_settings(state).await?;
    serde_json::to_string_pretty(&settings)
        .map_err(|e| crate::error::AppError::Serialization(e.to_string()))
}

/// 导入设置
#[tauri::command]
#[specta::specta]
pub async fn import_settings(
    state: State<'_, AppState>,
    settings_json: String,
) -> Result<AppSettings> {
    let settings: AppSettings = serde_json::from_str(&settings_json)
        .map_err(|e| crate::error::AppError::Serialization(e.to_string()))?;
    
    update_settings(state, settings.clone()).await?;
    
    Ok(settings)
}
