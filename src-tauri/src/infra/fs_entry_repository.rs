use std::fmt;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

#[derive(Debug)]
pub enum EntryRepositoryError {
    NotDirectory(PathBuf),
    ReadDirFailed { path: PathBuf, source: io::Error },
    ReadEntryFailed { path: PathBuf, source: io::Error },
    InvalidUtf8FileName { path: PathBuf },
}

impl fmt::Display for EntryRepositoryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotDirectory(path) => {
                write!(f, "path is not a directory: {}", path.display())
            }
            Self::ReadDirFailed { path, source } => {
                write!(f, "failed to read directory {}: {source}", path.display())
            }
            Self::ReadEntryFailed { path, source } => {
                write!(
                    f,
                    "failed to read an entry in directory {}: {source}",
                    path.display()
                )
            }
            Self::InvalidUtf8FileName { path } => {
                write!(f, "entry name is not valid UTF-8: {}", path.display())
            }
        }
    }
}

pub fn get_entry_names<P: AsRef<Path>>(
    folder_path: P,
) -> Result<Vec<String>, EntryRepositoryError> {
    let folder_path = folder_path.as_ref();

    if !folder_path.is_dir() {
        return Err(EntryRepositoryError::NotDirectory(
            folder_path.to_path_buf(),
        ));
    }

    let entries = fs::read_dir(folder_path).map_err(|err| EntryRepositoryError::ReadDirFailed {
        path: folder_path.to_path_buf(),
        source: err,
    })?;

    let mut names = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|err| EntryRepositoryError::ReadEntryFailed {
            path: folder_path.to_path_buf(),
            source: err,
        })?;

        let entry_path = entry.path();

        let name = entry
            .file_name()
            .into_string()
            .map_err(|_| EntryRepositoryError::InvalidUtf8FileName { path: entry_path })?;

        names.push(name);
    }

    Ok(names)
}
