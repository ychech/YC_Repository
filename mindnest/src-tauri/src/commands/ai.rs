use tauri::State;
use crate::AppState;
use crate::error::Result;
use crate::ai::{AIConfig, AIProvider, Message, AIEngine};
use crate::commands::settings::AppSettings;
use serde::{Deserialize, Serialize};

// =============================================================================
// 请求/响应类型定义
// =============================================================================

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



// =============================================================================
// 内部工具函数
// =============================================================================

/// 根据设置创建 AI 引擎配置
/// 
/// 提取公共逻辑，避免在每个命令函数中重复创建
fn create_ai_config(settings: &AppSettings, model: Option<String>, temperature: Option<f32>) -> AIConfig {
    AIConfig {
        provider: match settings.ai.api_provider.as_str() {
            "openai" => AIProvider::OpenAI,
            "anthropic" => AIProvider::Anthropic,
            "local" => AIProvider::Local,
            _ => AIProvider::Custom,
        },
        api_key: settings.ai.api_key.clone(),
        base_url: settings.ai.api_base_url.clone(),
        default_model: model.unwrap_or_else(|| settings.ai.preferred_model.clone()),
        default_temperature: temperature.unwrap_or(settings.ai.default_temperature),
        max_tokens: settings.ai.max_tokens,
    }
}

/// 根据配置创建 AI 引擎
fn create_ai_engine(config: AIConfig) -> AIEngine {
    let mut engine = AIEngine::new();
    engine.configure(config);
    engine
}

// =============================================================================
// Tauri 命令
// =============================================================================

/// 生成文本补全
#[tauri::command]
#[specta::specta]
pub async fn generate_completion(
    state: State<'_, AppState>,
    request: CompletionRequest,
) -> Result<CompletionResponse> {
    let settings = crate::commands::settings::get_settings(state).await?;
    let config = create_ai_config(&settings, request.model, request.temperature);
    let engine = create_ai_engine(config);
    
    let content = engine.generate_completion(&request.prompt, request.context.as_deref()).await?;
    
    Ok(CompletionResponse {
        content,
        tokens_used: None, // TODO: 从响应中获取
    })
}

/// 对话（支持上下文文档RAG）
#[tauri::command]
#[specta::specta]
pub async fn chat_with_context(
    state: State<'_, AppState>,
    request: ChatRequest,
) -> Result<CompletionResponse> {
    let settings = crate::commands::settings::get_settings(state.clone()).await?;
    let config = create_ai_config(&settings, request.model, None);
    let engine = create_ai_engine(config);
    
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

/// 获取智能建议（内联补全）
#[tauri::command]
#[specta::specta]
pub async fn get_suggestions(
    state: State<'_, AppState>,
    request: SuggestionRequest,
) -> Result<SuggestionResponse> {
    let settings = crate::commands::settings::get_settings(state).await?;
    
    if !settings.ai.enabled || !settings.ai.auto_completion {
        return Ok(SuggestionResponse { suggestions: vec![] });
    }
    
    // 建议生成使用较低 temperature
    let mut config = create_ai_config(&settings, None, Some(0.5));
    config.max_tokens = 500;
    let engine = create_ai_engine(config);
    
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
    let settings = crate::commands::settings::get_settings(state).await?;
    let config = create_ai_config(&settings, None, None);
    let engine = create_ai_engine(config);
    
    engine.generate_continuation(&context).await
}

/// 润色文本
#[tauri::command]
#[specta::specta]
pub async fn polish_text(
    state: State<'_, AppState>,
    text: String,
) -> Result<String> {
    let settings = crate::commands::settings::get_settings(state).await?;
    // 润色使用较低 temperature，更稳定
    let config = create_ai_config(&settings, None, Some(0.3));
    let engine = create_ai_engine(config);
    
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
    let settings = crate::commands::settings::get_settings(state).await?;
    // 摘要生成使用较低 temperature
    let mut config = create_ai_config(&settings, None, Some(0.3));
    config.max_tokens = 1000;
    let engine = create_ai_engine(config);
    
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
    let settings = crate::commands::settings::get_settings(state).await?;
    // 翻译使用较低 temperature，更精确
    let config = create_ai_config(&settings, None, Some(0.3));
    let engine = create_ai_engine(config);
    
    engine.translate(&text, &target_lang).await
}

// =============================================================================
// AI5 新增：智能标签和相似文档推荐
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateTagsRequest {
    pub content: String,
    pub existing_tags: Option<Vec<String>>, // 已存在的标签，用于避免重复
    pub max_tags: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateTagsResponse {
    pub tags: Vec<String>,
}

/// AI 智能生成标签
/// 
/// 分析文档内容，自动生成相关标签
#[tauri::command]
#[specta::specta]
pub async fn generate_tags(
    state: State<'_, AppState>,
    request: GenerateTagsRequest,
) -> Result<GenerateTagsResponse> {
    let settings = crate::commands::settings::get_settings(state).await?;
    
    if !settings.ai.enabled {
        return Ok(GenerateTagsResponse { tags: vec![] });
    }
    
    // 构建提示词
    let max_tags = request.max_tags.unwrap_or(5);
    let existing_tags_hint = request.existing_tags
        .filter(|t| !t.is_empty())
        .map(|t| format!("\n已存在的标签（请避免重复）：{}", t.join(", ")))
        .unwrap_or_default();
    
    let prompt = format!(
        "请分析以下文档内容，生成 {} 个最相关的标签。\n\
         标签要求：\n\
         - 简洁（1-3个中文字或英文单词）\n\
         - 反映核心主题\n\
         - 使用小写字母\n{}
         \n\
         文档内容：\n{}\n\n\
         请只返回标签列表，每行一个，不要其他解释。",
        max_tags,
        existing_tags_hint,
        &request.content[..request.content.len().min(3000)] // 限制长度避免token过多
    );
    
    let config = create_ai_config(&settings, None, Some(0.3));
    let engine = create_ai_engine(config);
    
    let response = engine.generate_completion(&prompt, None).await?;
    
    // 解析标签
    let tags: Vec<String> = response
        .lines()
        .map(|line| line.trim().to_lowercase())
        .filter(|line| !line.is_empty() && !line.starts_with('-'))
        .map(|line| {
            // 移除列表标记
            line.trim_start_matches("- ")
                .trim_start_matches("• ")
                .trim()
                .to_string()
        })
        .filter(|tag| !tag.is_empty() && tag.len() <= 20) // 过滤过长标签
        .take(max_tags)
        .collect();
    
    Ok(GenerateTagsResponse { tags })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FindSimilarRequest {
    pub doc_id: String,
    pub max_results: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimilarDocument {
    pub id: String,
    pub title: String,
    pub similarity_score: f32,
    pub reason: String, // 为什么相似
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FindSimilarResponse {
    pub documents: Vec<SimilarDocument>,
}

/// 查找相似文档
/// 
/// AI5 新增：基于内容分析找到相关文档
#[tauri::command]
#[specta::specta]
pub async fn find_similar_documents(
    state: State<'_, AppState>,
    request: FindSimilarRequest,
) -> Result<FindSimilarResponse> {
    let settings = crate::commands::settings::get_settings(state.clone()).await?;
    let max_results = request.max_results.unwrap_or(5);
    
    // 1. 获取当前文档内容
    let current_doc = state.db_pool.get_document(&request.doc_id)?;
    let kb_path = state.db_pool.get_kb_storage_path(&current_doc.kb_id)?;
    let current_content = crate::fs::read_document(kb_path.join(&current_doc.file_path))?;
    
    // 2. 获取同一知识库的所有其他文档
    let all_docs = state.db_pool.list_all_documents(&current_doc.kb_id)?;
    let other_docs: Vec<_> = all_docs.into_iter()
        .filter(|d| d.id != request.doc_id)
        .take(15) // 限制候选数量，避免AI token过多
        .collect();
    
    if other_docs.is_empty() {
        return Ok(FindSimilarResponse { documents: vec![] });
    }
    
    // 3. 使用简单的文本相似度筛选候选（避免AI token消耗过大）
    let current_title_lower = current_doc.title.to_lowercase();
    let candidates: Vec<_> = other_docs.into_iter()
        .filter(|d| {
            // 简单启发式：标题有关键词重叠
            let title_lower = d.title.to_lowercase();
            current_title_lower.split_whitespace().any(|cw| {
                let cw = cw.trim_matches(|c: char| !c.is_alphanumeric());
                cw.len() >= 2 && title_lower.contains(cw)
            })
        })
        .take(10)
        .collect();
    
    if candidates.is_empty() {
        return Ok(FindSimilarResponse { documents: vec![] });
    }
    
    // 4. 使用 AI 分析相似度
    let candidates_info = candidates.iter()
        .map(|d| format!("[{}] {}", d.id, d.title))
        .collect::<Vec<_>>()
        .join("\n");
    
    let prompt = format!(
        "分析以下文档与候选文档的相关性。\n\n\
         当前文档标题：{}\n\
         当前文档内容摘要：{}...\n\n\
         候选文档列表：\n{}\n\n\
         请返回最相关的 {} 个文档ID列表，格式：每行一个ID，按相关性排序。只返回ID，不要其他内容。",
        current_doc.title,
        &current_content[..current_content.len().min(500)],
        candidates_info,
        max_results
    );
    
    let config = create_ai_config(&settings, None, Some(0.3));
    let engine = create_ai_engine(config);
    
    let response = engine.generate_completion(&prompt, None).await?;
    
    // 5. 解析结果并构建响应
    let selected_ids: Vec<String> = response
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .filter(|l| candidates.iter().any(|c| c.id == *l))
        .take(max_results)
        .collect();
    
    let documents = selected_ids.iter()
        .filter_map(|id| {
            candidates.iter().find(|c| &c.id == id).map(|doc| SimilarDocument {
                id: doc.id.clone(),
                title: doc.title.clone(),
                similarity_score: 0.8, // 简化处理
                reason: "内容主题相关".to_string(),
            })
        })
        .collect();
    
    Ok(FindSimilarResponse { documents })
}
