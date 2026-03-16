use tauri::State;
use crate::AppState;
use crate::error::Result;
use crate::ai::{AIConfig, AIProvider, Message};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionRequest {
    pub prompt: String,
    pub context: Option<String>,
    pub model: Option<String>,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionResponse {
    pub content: String,
    pub tokens_used: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatRequest {
    pub messages: Vec<ChatMessage>,
    pub context_doc_ids: Option<Vec<String>>,
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SuggestionRequest {
    pub content: String,
    pub cursor_position: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SuggestionResponse {
    pub suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AISuggestion {
    pub type_: String,
    pub content: String,
    pub confidence: f32,
}

/// 生成文本补全
#[tauri::command]
#[specta::specta]
pub async fn generate_completion(
    state: State<'_, AppState>,
    request: CompletionRequest,
) -> Result<CompletionResponse> {
    // 从设置中获取 AI 配置
    let settings = crate::commands::settings::get_settings(state.clone()).await?;
    
    let mut engine = crate::ai::AIEngine::new();
    engine.configure(AIConfig {
        provider: match settings.ai.api_provider.as_str() {
            "openai" => AIProvider::OpenAI,
            "anthropic" => AIProvider::Anthropic,
            "local" => AIProvider::Local,
            _ => AIProvider::Custom,
        },
        api_key: settings.ai.api_key.clone(),
        base_url: settings.ai.api_base_url.clone(),
        default_model: request.model.unwrap_or_else(|| settings.ai.preferred_model.clone()),
        default_temperature: request.temperature.unwrap_or(settings.ai.default_temperature),
        max_tokens: settings.ai.max_tokens,
    });
    
    let content = engine.generate_completion(&request.prompt, request.context.as_deref()).await?;
    
    Ok(CompletionResponse {
        content,
        tokens_used: None, // TODO: 从响应中获取
    })
}

/// 对话
#[tauri::command]
#[specta::specta]
pub async fn chat_with_context(
    state: State<'_, AppState>,
    request: ChatRequest,
) -> Result<CompletionResponse> {
    let settings = crate::commands::settings::get_settings(state.clone()).await?;
    
    let mut engine = crate::ai::AIEngine::new();
    engine.configure(AIConfig {
        provider: match settings.ai.api_provider.as_str() {
            "openai" => AIProvider::OpenAI,
            "anthropic" => AIProvider::Anthropic,
            "local" => AIProvider::Local,
            _ => AIProvider::Custom,
        },
        api_key: settings.ai.api_key.clone(),
        base_url: settings.ai.api_base_url.clone(),
        default_model: settings.ai.preferred_model.clone(),
        default_temperature: settings.ai.default_temperature,
        max_tokens: settings.ai.max_tokens,
    });
    
    // 加载上下文文档
    let mut context_docs = Vec::new();
    if let Some(doc_ids) = request.context_doc_ids {
        for doc_id in doc_ids {
            if let Ok(doc) = state.db_pool.get_document(&doc_id) {
                let kb_path = state.db_pool.get_kb_storage_path(&doc.kb_id)?;
                if let Ok(content) = crate::fs::read_document(kb_path.join(&doc.file_path)) {
                    context_docs.push(format!("文档《{}》：\n{}", doc.title, content));
                }
            }
        }
    }
    
    // 构建消息
    let messages: Vec<Message> = request.messages.into_iter()
        .map(|m| Message { role: m.role, content: m.content })
        .collect();
    
    let content = if !context_docs.is_empty() {
        // 使用 RAG 模式
        let question = messages.last()
            .map(|m| m.content.clone())
            .unwrap_or_default();
        let context_refs: Vec<&str> = context_docs.iter().map(|s| s.as_str()).collect();
        engine.answer_with_context(&question, context_refs).await?
    } else {
        // 普通对话模式
        engine.chat(messages).await?
    };
    
    Ok(CompletionResponse {
        content,
        tokens_used: None,
    })
}

/// 获取智能建议
#[tauri::command]
#[specta::specta]
pub async fn get_suggestions(
    state: State<'_, AppState>,
    request: SuggestionRequest,
) -> Result<SuggestionResponse> {
    let settings = crate::commands::settings::get_settings(state.clone()).await?;
    
    if !settings.ai.enabled || !settings.ai.auto_completion {
        return Ok(SuggestionResponse { suggestions: vec![] });
    }
    
    let mut engine = crate::ai::AIEngine::new();
    engine.configure(AIConfig {
        provider: match settings.ai.api_provider.as_str() {
            "openai" => AIProvider::OpenAI,
            "anthropic" => AIProvider::Anthropic,
            "local" => AIProvider::Local,
            _ => AIProvider::Custom,
        },
        api_key: settings.ai.api_key.clone(),
        base_url: settings.ai.api_base_url.clone(),
        default_model: settings.ai.preferred_model.clone(),
        default_temperature: 0.7,
        max_tokens: 500,
    });
    
    let suggestions = engine.get_suggestions(&request.content, request.cursor_position).await?;
    
    Ok(SuggestionResponse { suggestions })
}

/// 续写内容
#[tauri::command]
#[specta::specta]
pub async fn continue_writing(
    state: State<'_, AppState>,
    context: String,
) -> Result<String> {
    let settings = crate::commands::settings::get_settings(state.clone()).await?;
    
    let mut engine = crate::ai::AIEngine::new();
    engine.configure(AIConfig {
        provider: match settings.ai.api_provider.as_str() {
            "openai" => AIProvider::OpenAI,
            "anthropic" => AIProvider::Anthropic,
            "local" => AIProvider::Local,
            _ => AIProvider::Custom,
        },
        api_key: settings.ai.api_key.clone(),
        base_url: settings.ai.api_base_url.clone(),
        default_model: settings.ai.preferred_model.clone(),
        default_temperature: settings.ai.default_temperature,
        max_tokens: settings.ai.max_tokens,
    });
    
    engine.generate_continuation(&context).await
}

/// 润色文本
#[tauri::command]
#[specta::specta]
pub async fn polish_text(
    state: State<'_, AppState>,
    text: String,
) -> Result<String> {
    let settings = crate::commands::settings::get_settings(state.clone()).await?;
    
    let mut engine = crate::ai::AIEngine::new();
    engine.configure(AIConfig {
        provider: match settings.ai.api_provider.as_str() {
            "openai" => AIProvider::OpenAI,
            "anthropic" => AIProvider::Anthropic,
            "local" => AIProvider::Local,
            _ => AIProvider::Custom,
        },
        api_key: settings.ai.api_key.clone(),
        base_url: settings.ai.api_base_url.clone(),
        default_model: settings.ai.preferred_model.clone(),
        default_temperature: 0.5,
        max_tokens: settings.ai.max_tokens,
    });
    
    engine.polish_text(&text).await
}

/// 生成摘要
#[tauri::command]
#[specta::specta]
pub async fn generate_summary(
    state: State<'_, AppState>,
    content: String,
    max_length: Option<usize>,
) -> Result<String> {
    let settings = crate::commands::settings::get_settings(state.clone()).await?;
    
    let mut engine = crate::ai::AIEngine::new();
    engine.configure(AIConfig {
        provider: match settings.ai.api_provider.as_str() {
            "openai" => AIProvider::OpenAI,
            "anthropic" => AIProvider::Anthropic,
            "local" => AIProvider::Local,
            _ => AIProvider::Custom,
        },
        api_key: settings.ai.api_key.clone(),
        base_url: settings.ai.api_base_url.clone(),
        default_model: settings.ai.preferred_model.clone(),
        default_temperature: 0.3,
        max_tokens: 1000,
    });
    
    engine.generate_summary(&content, max_length).await
}

/// 翻译文本
#[tauri::command]
#[specta::specta]
pub async fn translate_text(
    state: State<'_, AppState>,
    text: String,
    target_lang: String,
) -> Result<String> {
    let settings = crate::commands::settings::get_settings(state.clone()).await?;
    
    let mut engine = crate::ai::AIEngine::new();
    engine.configure(AIConfig {
        provider: match settings.ai.api_provider.as_str() {
            "openai" => AIProvider::OpenAI,
            "anthropic" => AIProvider::Anthropic,
            "local" => AIProvider::Local,
            _ => AIProvider::Custom,
        },
        api_key: settings.ai.api_key.clone(),
        base_url: settings.ai.api_base_url.clone(),
        default_model: settings.ai.preferred_model.clone(),
        default_temperature: 0.3,
        max_tokens: settings.ai.max_tokens,
    });
    
    engine.translate(&text, &target_lang).await
}
