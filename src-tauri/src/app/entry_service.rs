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
