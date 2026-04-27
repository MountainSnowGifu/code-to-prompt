use crate::app;
use crate::infra;

#[derive(serde::Serialize)]
pub struct ExportEntryNamesResponse {
    entries: Vec<String>,
    output_path: String,
}

#[derive(serde::Serialize)]
pub struct ExportDiffResponse {
    content: String,
    output_path: String,
}

#[derive(serde::Serialize)]
pub struct ExportSourceResponse {
    output_paths: Vec<String>,
    skipped_paths: Vec<String>,
}

#[derive(serde::Serialize)]
pub struct SourceTextResponse {
    content: String,
    skipped_paths: Vec<String>,
}

#[tauri::command]
pub fn get_diff_command(path: &str) -> Result<String, String> {
    eprintln!("[get_diff_command] called: path={path:?}");

    match app::get_diff(path) {
        Ok(diff) => {
            eprintln!("[get_diff_command] success: {} bytes", diff.len());
            Ok(diff)
        }
        Err(err) => {
            eprintln!("[get_diff_command] error: {err}");
            Err(err.to_string())
        }
    }
}

#[tauri::command]
pub fn export_diff_command(path: &str) -> Result<ExportDiffResponse, String> {
    eprintln!("[export_diff_command] called: path={path:?}");

    match app::export_diff(path) {
        Ok(result) => {
            eprintln!(
                "[export_diff_command] success: exported to {}",
                result.output_path
            );
            Ok(ExportDiffResponse {
                content: result.content,
                output_path: result.output_path,
            })
        }
        Err(err) => {
            eprintln!("[export_diff_command] error: {err}");
            Err(err.to_string())
        }
    }
}

#[tauri::command]
pub fn count_source_chars_command(path: &str, paths: Vec<String>) -> Result<usize, String> {
    infra::count_source_chars(path, &paths).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn get_source_text_command(
    path: &str,
    paths: Vec<String>,
) -> Result<SourceTextResponse, String> {
    eprintln!(
        "[get_source_text_command] called: path={path:?}, {} files",
        paths.len()
    );

    match infra::read_source_text(path, &paths) {
        Ok(result) => {
            eprintln!(
                "[get_source_text_command] success: {} bytes, {} skipped",
                result.content.len(),
                result.skipped_paths.len()
            );
            Ok(SourceTextResponse {
                content: result.content,
                skipped_paths: result.skipped_paths,
            })
        }
        Err(err) => {
            eprintln!("[get_source_text_command] error: {err}");
            Err(err.to_string())
        }
    }
}

#[tauri::command]
pub fn export_source_command(
    path: &str,
    paths: Vec<String>,
) -> Result<ExportSourceResponse, String> {
    eprintln!(
        "[export_source_command] called: path={path:?}, {} files",
        paths.len()
    );

    match app::export_source(path, paths) {
        Ok(result) => {
            eprintln!(
                "[export_source_command] success: {} file(s) exported, {} skipped",
                result.output_paths.len(),
                result.skipped_paths.len()
            );
            Ok(ExportSourceResponse {
                output_paths: result.output_paths,
                skipped_paths: result.skipped_paths,
            })
        }
        Err(err) => {
            eprintln!("[export_source_command] error: {err}");
            Err(err.to_string())
        }
    }
}

#[tauri::command]
pub fn export_filtered_tree_command(path: &str, paths: Vec<String>) -> Result<String, String> {
    eprintln!(
        "[export_filtered_tree_command] called: path={path:?}, {} paths",
        paths.len()
    );

    match infra::write_file_tree_file(path, &paths) {
        Ok(p) => {
            eprintln!(
                "[export_filtered_tree_command] success: exported to {}",
                p.display()
            );
            Ok(p.display().to_string())
        }
        Err(err) => {
            eprintln!("[export_filtered_tree_command] error: {err}");
            Err(err.to_string())
        }
    }
}

#[tauri::command]
pub fn get_file_tree_command(path: &str) -> Result<Vec<String>, String> {
    eprintln!("[get_file_tree_command] called: path={path:?}");

    match app::get_file_tree(path) {
        Ok(tree) => {
            eprintln!("[get_file_tree_command] success: {} entries", tree.len());
            Ok(tree)
        }
        Err(err) => {
            eprintln!("[get_file_tree_command] error: {err}");
            Err(err.to_string())
        }
    }
}

#[tauri::command]
pub fn export_file_tree_command(path: &str) -> Result<ExportEntryNamesResponse, String> {
    eprintln!("[export_file_tree_command] called: path={path:?}");

    match app::export_file_tree(path) {
        Ok(result) => {
            eprintln!(
                "[export_file_tree_command] success: {} entries exported to {}",
                result.entries.len(),
                result.output_path
            );
            Ok(ExportEntryNamesResponse {
                entries: result.entries,
                output_path: result.output_path,
            })
        }
        Err(err) => {
            eprintln!("[export_file_tree_command] error: {err}");
            Err(err.to_string())
        }
    }
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
