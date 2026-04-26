mod app;
mod commands;
mod infra;

use commands::{
    export_diff_command, export_entry_names_command, export_file_tree_command, get_diff_command,
    get_entry_names_command, get_file_tree_command,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_entry_names_command,
            export_entry_names_command,
            get_file_tree_command,
            export_file_tree_command,
            get_diff_command,
            export_diff_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
