use crate::app::AppError;
use crate::infra;

pub struct ExportedEntryNames {
    pub entries: Vec<String>,
    pub output_path: String,
}

pub fn get_entry_names(path: &str) -> Result<Vec<String>, AppError> {
    infra::get_entry_names(path).map_err(AppError::from)
}

pub fn export_entry_names(path: &str) -> Result<ExportedEntryNames, AppError> {
    let entries = infra::get_entry_names(path)?;
    let output_path = infra::write_entry_names_file(path, &entries)?;

    Ok(ExportedEntryNames {
        entries,
        output_path: output_path.display().to_string(),
    })
}

pub fn get_file_tree(path: &str) -> Result<Vec<String>, AppError> {
    infra::get_file_tree(path).map_err(AppError::from)
}

pub fn export_file_tree(path: &str) -> Result<ExportedEntryNames, AppError> {
    let entries = infra::get_file_tree(path)?;
    let output_path = infra::write_file_tree_file(path, &entries)?;

    Ok(ExportedEntryNames {
        entries,
        output_path: output_path.display().to_string(),
    })
}

pub struct ExportedSource {
    pub output_paths: Vec<String>,
    pub skipped_paths: Vec<String>,
}

pub fn export_source(path: &str, file_paths: Vec<String>) -> Result<ExportedSource, AppError> {
    let result = infra::write_source_file(path, &file_paths).map_err(AppError::from)?;
    Ok(ExportedSource {
        output_paths: result
            .output_paths
            .iter()
            .map(|p| p.display().to_string())
            .collect(),
        skipped_paths: result.skipped_paths,
    })
}

pub struct ExportedDiff {
    pub content: String,
    pub output_path: String,
}

pub fn get_diff(path: &str) -> Result<String, AppError> {
    infra::get_git_diff(path).map_err(AppError::from)
}

pub fn export_diff(path: &str) -> Result<ExportedDiff, AppError> {
    let content = infra::get_git_diff(path)?;
    let output_path = infra::write_git_diff_file(path, &content)?;

    Ok(ExportedDiff {
        content,
        output_path: output_path.display().to_string(),
    })
}
