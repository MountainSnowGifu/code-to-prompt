use crate::app::AppError;
use crate::infra;

pub fn get_entry_names(path: &str) -> Result<Vec<String>, AppError> {
    infra::get_entry_names(path).map_err(AppError::from)
}
