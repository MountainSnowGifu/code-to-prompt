use crate::app;

#[derive(serde::Serialize)]
pub struct ExportEntryNamesResponse {
    entries: Vec<String>,
    output_path: String,
}

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

#[tauri::command]
pub fn export_entry_names_command(path: &str) -> Result<ExportEntryNamesResponse, String> {
    eprintln!("[export_entry_names_command] called: path={path:?}");

    match app::export_entry_names(path) {
        Ok(result) => {
            eprintln!(
                "[export_entry_names_command] success: {} entries exported to {}",
                result.entries.len(),
                result.output_path
            );

            Ok(ExportEntryNamesResponse {
                entries: result.entries,
                output_path: result.output_path,
            })
        }
        Err(err) => {
            eprintln!("[export_entry_names_command] error: {err}");
            Err(err.to_string())
        }
    }
}
