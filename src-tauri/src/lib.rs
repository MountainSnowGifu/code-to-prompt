mod app;
mod commands;
mod infra;

use commands::{
    count_source_chars_command, export_diff_command, export_entry_names_command,
    export_file_tree_command, export_filtered_tree_command, export_source_command,
    get_diff_command, get_entry_names_command, get_file_tree_command, get_source_text_command,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_entry_names_command,
            export_entry_names_command,
            get_file_tree_command,
            export_file_tree_command,
            get_diff_command,
            export_diff_command,
            export_filtered_tree_command,
            export_source_command,
            get_source_text_command,
            count_source_chars_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
