use sha2::{Sha256, Digest};
use regex::Regex;

pub struct SuperMemoryConfig {
    pub compaction_threshold: f32,
}

impl Default for SuperMemoryConfig {
    fn default() -> Self {
        Self {
            compaction_threshold: 0.8,
        }
    }
}

pub struct SuperMemory {
    config: SuperMemoryConfig,
}

impl SuperMemory {
    pub fn new() -> Self {
        Self {
            config: SuperMemoryConfig::default(),
        }
    }

    /// Filtrowanie tagów <private> z tekstów przed haszowaniem i zapisem.
    pub fn apply_privacy_filters(&self, input: &str) -> String {
        // Zastępuje wszystkie wystąpienia <private>...</private> ciągiem [REDACTED]
        let re = Regex::new(r"(?s)<private>.*?</private>").unwrap();
        re.replace_all(input, "[REDACTED]").to_string()
    }

    /// Haszowanie zawartości (np. profil developera, repozytorium) za pomocą SHA-256.
    pub fn hash_container_profile(&self, data: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data.as_bytes());
        let result = hasher.finalize();
        hex::encode(result)
    }

    /// Symulacja kompresji kontekstu
    pub fn compress_context(&self, usage_ratio: f32) -> bool {
        if usage_ratio >= self.config.compaction_threshold {
            println!("[SuperMemory] Compaction triggered! (Ratio: {:.2})", usage_ratio);
            true
        } else {
            false
        }
    }
}
