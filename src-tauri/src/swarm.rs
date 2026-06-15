use std::collections::HashSet;
use serde::{Deserialize, Serialize};
use std::sync::mpsc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTask {
    pub id: String,
    pub payload: String,
    pub required_tags: HashSet<String>,
    pub preferred_tags: HashSet<String>,
    pub excluded_tags: HashSet<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentNode {
    pub id: String,
    pub capabilities: HashSet<String>,
}

pub struct FlatMeshNetwork {
    pub nodes: Vec<AgentNode>,
    // P2P Event bus (symulacja za pomocą kanałów mpsc)
    sender: mpsc::Sender<AgentTask>,
    receiver: mpsc::Receiver<AgentTask>,
}

impl FlatMeshNetwork {
    pub fn new() -> Self {
        let (sender, receiver) = mpsc::channel();
        Self {
            nodes: Vec::new(),
            sender,
            receiver,
        }
    }

    pub fn register_node(&mut self, node: AgentNode) {
        self.nodes.push(node);
    }

    /// Wdrożenie DDDI (Distributed Dynamic Dependency Injection)
    /// Oblicza Score = Σw_req + Σw_pref - Σ∞_excl
    pub fn calculate_score(task: &AgentTask, candidate: &AgentNode) -> f32 {
        let w_req = 10.0;
        let w_pref = 2.0;

        // Σ∞_excl: jeśli kandydat ma jakikolwiek tag wykluczający, natychmiast dyskwalifikuje
        for excl in &task.excluded_tags {
            if candidate.capabilities.contains(excl) {
                return f32::NEG_INFINITY;
            }
        }

        let mut score = 0.0;

        // Σw_req
        for req in &task.required_tags {
            if candidate.capabilities.contains(req) {
                score += w_req;
            }
        }

        // Σw_pref
        for pref in &task.preferred_tags {
            if candidate.capabilities.contains(pref) {
                score += w_pref;
            }
        }

        score
    }

    /// Znajduje najlepszego agenta do wykonania zadania (najwyższy Score)
    pub fn route_task(&self, task: AgentTask) -> Option<AgentNode> {
        let mut best_node: Option<&AgentNode> = None;
        let mut best_score = f32::NEG_INFINITY;

        for node in &self.nodes {
            let score = Self::calculate_score(&task, node);
            if score > best_score && score > 0.0 {
                best_score = score;
                best_node = Some(node);
            }
        }

        best_node.cloned()
    }
}
