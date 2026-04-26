use crate::app;

#[tauri::command]
pub fn get_entry_names_command(path: &str) -> Result<Vec<String>, String> {
    eprintln!("[get_entry_names_command] called: path={path:?}");

    match app::get_entry_names(path) {
        Ok(names) => {
            eprintln!(
                "[get_entry_names_command] success: {} entries found",
                names.len()
            );

            for name in &names {
                eprintln!("[get_entry_names_command] entry: {name}");
            }

            Ok(names)
        }
        Err(err) => {
            eprintln!("[get_entry_names_command] error: {err}");
            Err(err.to_string())
        }
    }
}
