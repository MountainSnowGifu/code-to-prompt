use std::fmt;

use crate::infra::EntryRepositoryError;

#[derive(Debug)]
pub enum AppError {
    EntryRepository(EntryRepositoryError),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EntryRepository(source) => write!(f, "{source}"),
        }
    }
}

impl From<EntryRepositoryError> for AppError {
    fn from(source: EntryRepositoryError) -> Self {
        Self::EntryRepository(source)
    }
}
