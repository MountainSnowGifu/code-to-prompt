use tauri::Manager;

#[tauri::command]
pub fn init_agent_workspace(app_handle: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let workspace_root = data_dir.join("ubuntu-ai");
    crate::agent::init_workspace(&workspace_root).map_err(|e| e.to_string())?;
    Ok(workspace_root.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn execute_json_command(
    app_handle: tauri::AppHandle,
    json: String,
    base_dir: Option<String>,
) -> Result<Vec<crate::agent::ActionResult>, String> {
    let data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let workspace_root = data_dir.join("ubuntu-ai");
    let base_path = base_dir.as_deref().map(std::path::Path::new);
    crate::agent::execute_json(&json, &workspace_root, base_path)
}
