use std::env;
use std::fmt;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

#[derive(Debug)]
pub enum EntryRepositoryError {
    NotDirectory(PathBuf),
    ReadDirFailed { path: PathBuf, source: io::Error },
    ReadEntryFailed { path: PathBuf, source: io::Error },
    DownloadsDirectoryNotFound,
    CreateDownloadsDirectoryFailed { path: PathBuf, source: io::Error },
    WriteFileFailed { path: PathBuf, source: io::Error },
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
            Self::DownloadsDirectoryNotFound => {
                write!(f, "downloads directory was not found")
            }
            Self::CreateDownloadsDirectoryFailed { path, source } => {
                write!(
                    f,
                    "failed to create downloads directory {}: {source}",
                    path.display()
                )
            }
            Self::WriteFileFailed { path, source } => {
                write!(f, "failed to write file {}: {source}", path.display())
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

pub fn write_entry_names_file<P: AsRef<Path>>(
    folder_path: P,
    entries: &[String],
) -> Result<PathBuf, EntryRepositoryError> {
    let folder_path = folder_path.as_ref();
    let folder_name = folder_path
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .unwrap_or("entries");
    let file_name = format!("{}-entries.txt", sanitize_file_name(folder_name));
    let output_dir = downloads_dir()?;
    fs::create_dir_all(&output_dir).map_err(|err| {
        EntryRepositoryError::CreateDownloadsDirectoryFailed {
            path: output_dir.clone(),
            source: err,
        }
    })?;

    let output_path = output_dir.join(file_name);
    let contents = build_entries_text(folder_path, entries);

    fs::write(&output_path, contents).map_err(|err| EntryRepositoryError::WriteFileFailed {
        path: output_path.clone(),
        source: err,
    })?;

    Ok(output_path)
}

fn downloads_dir() -> Result<PathBuf, EntryRepositoryError> {
    if let Some(home) = env::var_os("HOME") {
        let home_path = PathBuf::from(home);

        if let Some(path) = xdg_download_dir(&home_path) {
            return Ok(path);
        }

        return Ok(home_path.join("Downloads"));
    }

    if let Some(profile) = env::var_os("USERPROFILE") {
        return Ok(PathBuf::from(profile).join("Downloads"));
    }

    Err(EntryRepositoryError::DownloadsDirectoryNotFound)
}

fn xdg_download_dir(home_path: &Path) -> Option<PathBuf> {
    let config_path = home_path.join(".config/user-dirs.dirs");
    let config = fs::read_to_string(config_path).ok()?;

    for line in config.lines() {
        let line = line.trim();
        let Some(value) = line.strip_prefix("XDG_DOWNLOAD_DIR=") else {
            continue;
        };
        let value = value.trim().trim_matches('"');

        if let Some(relative_path) = value.strip_prefix("$HOME/") {
            return Some(home_path.join(relative_path));
        }

        if value == "$HOME" {
            return Some(home_path.to_path_buf());
        }

        if Path::new(value).is_absolute() {
            return Some(PathBuf::from(value));
        }
    }

    None
}

fn build_entries_text(folder_path: &Path, entries: &[String]) -> String {
    let mut lines = vec![
        format!("Folder: {}", folder_path.display()),
        format!("Entries: {}", entries.len()),
        String::new(),
    ];
    lines.extend(entries.iter().cloned());
    lines.join("\n")
}

fn sanitize_file_name(value: &str) -> String {
    let sanitized: String = value
        .chars()
        .map(|ch| match ch {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' | '\0'..='\u{1f}' => '_',
            _ => ch,
        })
        .take(80)
        .collect();

    if sanitized.is_empty() {
        "entries".to_string()
    } else {
        sanitized
    }
}
