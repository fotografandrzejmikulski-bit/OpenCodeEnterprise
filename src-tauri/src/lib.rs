mod database;
mod supermemory;
mod swarm;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentRequest {
    pub task_id: String,
    pub action: String,
    pub payload: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

#[tauri::command]
fn execute_agent_action(request: AgentRequest) -> AgentResponse {
    println!("Received action: {} for task: {}", request.action, request.task_id);
    
    // Placeholder logic for execution
    AgentResponse {
        success: true,
        message: format!("Action '{}' executed successfully.", request.action),
        data: Some(serde_json::json!({ "status": "ok" })),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![execute_agent_action])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
