use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// ==================== 基础类型 ====================

pub type ID = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: ID,
    pub name: String,
    pub description: Option<String>,
    pub owner_id: String,
    pub icon: Option<String>,
    pub settings: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeBase {
    pub id: ID,
    pub workspace_id: ID,
    pub name: String,
    pub description: Option<String>,
    pub icon: String,
    pub color: Option<String>,
    pub storage_path: String,
    pub settings: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub id: ID,
    pub kb_id: ID,
    pub parent_id: Option<ID>,
    pub name: String,
    pub icon: String,
    pub color: Option<String>,
    pub position: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub id: ID,
    pub kb_id: ID,
    pub parent_id: Option<ID>,
    pub folder_id: Option<ID>,  // 关联到文件夹
    pub title: String,
    pub slug: Option<String>,
    pub content_type: ContentType,
    pub file_path: String,
    pub file_size: i64,
    pub checksum: Option<String>,
    pub version: i32,
    pub frontmatter: serde_json::Value,
    pub word_count: i32,
    pub reading_time: i32,
    pub status: DocumentStatus,
    pub is_pinned: bool,
    pub is_favorite: bool,
    pub tags: Vec<Tag>,
    pub links: Vec<Link>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentSummary {
    pub id: ID,
    pub kb_id: ID,
    pub parent_id: Option<ID>,
    pub folder_id: Option<ID>,  // 关联到文件夹
    pub title: String,
    pub content_type: ContentType,
    pub word_count: i32,
    pub is_pinned: bool,
    pub is_favorite: bool,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ContentType {
    Markdown,
    Database,
    Canvas,
}

impl ContentType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ContentType::Markdown => "markdown",
            ContentType::Database => "database",
            ContentType::Canvas => "canvas",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DocumentStatus {
    Active,
    Archived,
    Deleted,
}

impl std::fmt::Display for DocumentStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DocumentStatus::Active => write!(f, "active"),
            DocumentStatus::Archived => write!(f, "archived"),
            DocumentStatus::Deleted => write!(f, "deleted"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Block {
    pub id: ID,
    pub document_id: ID,
    pub block_type: BlockType,
    pub content: serde_json::Value,
    pub parent_id: Option<ID>,
    pub position: i32,
    pub attrs: serde_json::Value,
    pub ai_metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum BlockType {
    Paragraph,
    Heading,
    Code,
    Quote,
    ListItem,
    BulletList,
    OrderedList,
    Table,
    Image,
    Embed,
    Divider,
    Callout,
    AiGenerated,
    Math,
    Mermaid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: ID,
    pub kb_id: ID,
    pub name: String,
    pub color: String,
    pub icon: Option<String>,
    pub parent_id: Option<ID>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Link {
    pub id: ID,
    pub source_doc_id: ID,
    pub source_block_id: Option<ID>,
    pub target_doc_id: ID,
    pub target_block_id: Option<ID>,
    pub link_text: Option<String>,
    pub context: Option<String>,
    pub link_type: LinkType,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LinkType {
    Mention,
    Embed,
    Backlink,
    Reference,
}

// ==================== AI 相关 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AICompletionRequest {
    pub document_id: Option<ID>,
    pub prompt: String,
    pub context: Option<String>,
    pub model: Option<String>,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AIChatRequest {
    pub messages: Vec<ChatMessage>,
    pub context_doc_ids: Option<Vec<ID>>,
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub role: MessageRole,
    pub content: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    System,
    User,
    Assistant,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AISuggestion {
    pub type_: SuggestionType,
    pub content: String,
    pub confidence: f32,
    pub source_doc_ids: Vec<ID>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum SuggestionType {
    Completion,
    Link,
    Tag,
    Summary,
    Related,
}

// ==================== 搜索相关 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchQuery {
    pub q: String,
    pub kb_id: Option<ID>,
    pub filters: Option<SearchFilters>,
    pub limit: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SearchFilters {
    pub tags: Option<Vec<String>>,
    pub content_types: Option<Vec<ContentType>>,
    pub date_from: Option<DateTime<Utc>>,
    pub date_to: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub document: DocumentSummary,
    pub highlights: Vec<String>,
    pub score: f32,
}

// ==================== 图谱相关 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphNode {
    pub id: ID,
    pub node_type: NodeType,
    pub label: String,
    pub x: f32,
    pub y: f32,
    pub size: f32,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdge {
    pub id: ID,
    pub source: ID,
    pub target: ID,
    pub edge_type: EdgeType,
    pub weight: f32,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NodeType {
    Document,
    Block,
    Tag,
    Entity,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum EdgeType {
    Link,
    Similar,
    Reference,
    Semantic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}
