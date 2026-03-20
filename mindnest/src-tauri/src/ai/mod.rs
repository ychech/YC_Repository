//! AI 模块
//! 支持 OpenAI/Anthropic API 和本地模型

use crate::error::{Result, AppError};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tracing::error;

/// AI 提供商
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AIProvider {
    Local,
    OpenAI,
    Anthropic,
    Custom,
}

/// AI 请求
#[derive(Debug, Clone, Serialize)]
pub struct AIRequest {
    pub messages: Vec<Message>,
    pub model: String,
    pub temperature: f32,
    pub max_tokens: i32,
    pub stream: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

/// AI 响应
#[derive(Debug, Clone, Deserialize)]
pub struct AIResponse {
    pub choices: Vec<Choice>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Choice {
    pub message: Message,
    pub finish_reason: Option<String>,
}

/// AI 引擎
pub struct AIEngine {
    client: Client,
    config: AIConfig,
}

#[derive(Debug, Clone)]
pub struct AIConfig {
    pub provider: AIProvider,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub default_model: String,
    pub default_temperature: f32,
    pub max_tokens: i32,
}

impl Default for AIConfig {
    fn default() -> Self {
        Self {
            provider: AIProvider::OpenAI,
            api_key: None,
            base_url: None,
            default_model: "gpt-4o-mini".to_string(),
            default_temperature: 0.7,
            max_tokens: 2000,
        }
    }
}

impl AIEngine {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            config: AIConfig::default(),
        }
    }
    
    /// 更新配置
    pub fn configure(&mut self, config: AIConfig) {
        self.config = config;
    }
    
    /// 生成文本补全
    pub async fn generate_completion(&self, prompt: &str, context: Option<&str>) -> Result<String> {
        let messages = vec![
            Message {
                role: "system".to_string(),
                content: "你是一个专业的写作助手，帮助用户改进和扩展他们的文档内容。请用中文回复。".to_string(),
            },
            Message {
                role: "user".to_string(),
                content: if let Some(ctx) = context {
                    format!("上下文：{}\n\n提示：{}", ctx, prompt)
                } else {
                    prompt.to_string()
                },
            },
        ];
        
        self.chat(messages).await
    }
    
    /// 对话
    pub async fn chat(&self, messages: Vec<Message>) -> Result<String> {
        match self.config.provider {
            AIProvider::OpenAI | AIProvider::Custom => {
                self.chat_openai(messages).await
            }
            AIProvider::Anthropic => {
                self.chat_anthropic(messages).await
            }
            AIProvider::Local => {
                // TODO: 实现本地模型调用
                Err(AppError::Ai("Local model not implemented yet".to_string()))
            }
        }
    }
    
    /// OpenAI API 调用
    async fn chat_openai(&self, messages: Vec<Message>) -> Result<String> {
        let api_key = self.config.api_key.as_ref()
            .ok_or_else(|| AppError::Ai("API key not configured".to_string()))?;
        
        let base_url = self.config.base_url.as_ref()
            .map(|s| s.trim_end_matches('/').to_string())
            .unwrap_or_else(|| "https://api.openai.com/v1".to_string());
        
        let request = AIRequest {
            messages,
            model: self.config.default_model.clone(),
            temperature: self.config.default_temperature,
            max_tokens: self.config.max_tokens,
            stream: false,
        };
        
        let response = self.client
            .post(format!("{}/chat/completions", base_url))
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AppError::Ai(format!("Request failed: {}", e)))?;
        
        if !response.status().is_success() {
            let error_text = response.text().await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(AppError::Ai(format!("API error: {}", error_text)));
        }
        
        let ai_response: AIResponse = response.json().await
            .map_err(|e| AppError::Ai(format!("Failed to parse response: {}", e)))?;
        
        ai_response.choices
            .into_iter()
            .next()
            .map(|c| c.message.content)
            .ok_or_else(|| AppError::Ai("Empty response".to_string()))
    }
    
    /// Anthropic API 调用
    async fn chat_anthropic(&self, messages: Vec<Message>) -> Result<String> {
        let api_key = self.config.api_key.as_ref()
            .ok_or_else(|| AppError::Ai("API key not configured".to_string()))?;
        
        #[derive(Serialize)]
        struct AnthropicRequest {
            model: String,
            messages: Vec<Message>,
            max_tokens: i32,
            temperature: f32,
        }
        
        #[derive(Deserialize)]
        struct AnthropicResponse {
            content: Vec<AnthropicContent>,
        }
        
        #[derive(Deserialize)]
        struct AnthropicContent {
            text: String,
        }
        
        let request = AnthropicRequest {
            model: self.config.default_model.clone(),
            messages,
            max_tokens: self.config.max_tokens,
            temperature: self.config.default_temperature,
        };
        
        let response = self.client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("Content-Type", "application/json")
            .header("anthropic-version", "2023-06-01")
            .json(&request)
            .send()
            .await
            .map_err(|e| AppError::Ai(format!("Request failed: {}", e)))?;
        
        if !response.status().is_success() {
            let error_text = response.text().await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(AppError::Ai(format!("API error: {}", error_text)));
        }
        
        let ai_response: AnthropicResponse = response.json().await
            .map_err(|e| AppError::Ai(format!("Failed to parse response: {}", e)))?;
        
        ai_response.content
            .into_iter()
            .next()
            .map(|c| c.text)
            .ok_or_else(|| AppError::Ai("Empty response".to_string()))
    }
    
    /// 生成续写建议
    pub async fn generate_continuation(&self, context: &str) -> Result<String> {
        let prompt = format!(
            "基于以下内容，续写下一段。保持相同的语气和风格：\n\n{}",
            context
        );
        
        self.generate_completion(&prompt, None).await
    }
    
    /// 生成摘要
    pub async fn generate_summary(&self, content: &str, max_length: Option<usize>) -> Result<String> {
        let max_len = max_length.unwrap_or(200);
        let prompt = format!(
            "请为以下内容生成一个简洁的摘要，不超过 {} 字：\n\n{}",
            max_len,
            content
        );
        
        self.generate_completion(&prompt, None).await
    }
    
    /// 润色文本
    pub async fn polish_text(&self, text: &str) -> Result<String> {
        let prompt = format!(
            "请润色以下文本，使其更加通顺和专业，但保持原意：\n\n{}",
            text
        );
        
        self.generate_completion(&prompt, None).await
    }
    
    /// 翻译文本
    pub async fn translate(&self, text: &str, target_lang: &str) -> Result<String> {
        let prompt = format!(
            "请将以下内容翻译成{}：\n\n{}",
            target_lang,
            text
        );
        
        self.generate_completion(&prompt, None).await
    }
    
    /// 获取智能建议
    pub async fn get_suggestions(&self, context: &str, cursor_position: usize) -> Result<Vec<String>> {
        // 截取光标前的上下文
        let context_before = &context[..cursor_position.min(context.len())];
        
        let prompt = format!(
            "基于以下写作上下文，提供 3 个可能的续写建议（每行一个）：\n\n{}",
            context_before
        );
        
        let response = self.generate_completion(&prompt, None).await?;
        
        // 解析建议
        let suggestions: Vec<String> = response
            .lines()
            .filter(|l| !l.trim().is_empty())
            .take(3)
            .map(|l| l.trim().to_string())
            .collect();
        
        Ok(suggestions)
    }
    
    /// 回答基于文档的问题 (RAG)
    pub async fn answer_with_context(&self, question: &str, context_docs: Vec<&str>) -> Result<String> {
        let context = context_docs.join("\n\n---\n\n");
        
        let messages = vec![
            Message {
                role: "system".to_string(),
                content: "你是一个知识库助手，基于提供的文档内容回答问题。如果文档中没有相关信息，请明确说明。".to_string(),
            },
            Message {
                role: "user".to_string(),
                content: format!(
                    "基于以下文档内容回答问题：\n\n{}\n\n问题：{}",
                    context,
                    question
                ),
            },
        ];
        
        self.chat(messages).await
    }
}

impl Default for AIEngine {
    fn default() -> Self {
        Self::new()
    }
}
