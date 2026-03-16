//! 文件系统操作模块
//! 处理文档内容的读写

use std::path::Path;
use crate::error::{Result, AppError};
use sha2::{Sha256, Digest};

/// 读取文档内容
pub fn read_document<P: AsRef<Path>>(path: P) -> Result<String> {
    std::fs::read_to_string(path)
        .map_err(|e| AppError::Io(format!("Failed to read file: {}", e)))
}

/// 写入文档内容
pub fn write_document<P: AsRef<Path>>(path: P, content: &str) -> Result<()> {
    // 确保父目录存在
    if let Some(parent) = path.as_ref().parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::Io(format!("Failed to create directory: {}", e)))?;
    }
    
    std::fs::write(&path, content)
        .map_err(|e| AppError::Io(format!("Failed to write file: {}", e)))?;
    
    Ok(())
}

/// 计算内容的 SHA256 校验和
pub fn calculate_checksum(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// 计算字数（中文字符 + 英文单词）
pub fn count_words(content: &str) -> i32 {
    let chinese_chars = content.chars().filter(|c| !c.is_ascii()).count() as i32;
    let english_words = content.split_whitespace().count() as i32;
    chinese_chars + english_words
}

/// 估算阅读时间（分钟）
pub fn estimate_reading_time(word_count: i32) -> i32 {
    // 假设平均阅读速度：中文 300 字/分钟，英文 200 词/分钟
    // 取保守估计 250
    (word_count as f32 / 250.0).ceil() as i32
}

/// 生成 slug
pub fn generate_slug(title: &str) -> String {
    title
        .to_lowercase()
        .replace(' ', "-")
        .replace(|c: char| !c.is_alphanumeric() && c != '-', "")
}
