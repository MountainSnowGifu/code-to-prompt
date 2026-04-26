use chrono::Local;
use std::env;
use std::fmt;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::process::Command;

fn now_str() -> String {
    Local::now().format("%Y%m%d%H%M%S").to_string()
}

struct TreeNode {
    name: String,
    is_dir: bool,
    children: Vec<TreeNode>,
}

impl TreeNode {
    fn new(name: &str, is_dir: bool) -> Self {
        Self {
            name: name.to_string(),
            is_dir,
            children: Vec::new(),
        }
    }

    fn add_path(&mut self, parts: &[&str], is_dir: bool) {
        if parts.is_empty() {
            return;
        }
        let head = parts[0];
        let rest = &parts[1..];
        let child_is_dir = !rest.is_empty() || is_dir;

        let child = self.children.iter_mut().find(|c| c.name == head);
        let child = if let Some(c) = child {
            c
        } else {
            self.children.push(TreeNode::new(head, child_is_dir));
            self.children.last_mut().unwrap()
        };
        child.add_path(rest, is_dir);
    }

    fn sort_recursive(&mut self) {
        self.children.sort_by(|a, b| match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        });
        for child in &mut self.children {
            child.sort_recursive();
        }
    }

    fn to_flat_paths(&self, prefix: &str, out: &mut Vec<String>) {
        for child in &self.children {
            let path = if prefix.is_empty() {
                child.name.clone()
            } else {
                format!("{}/{}", prefix, child.name)
            };
            if child.is_dir {
                out.push(format!("{}/", path));
                child.to_flat_paths(&path, out);
            } else {
                out.push(path);
            }
        }
    }
}

fn build_tree_from_paths(root_name: &str, paths: &[String]) -> TreeNode {
    let mut root = TreeNode::new(root_name, true);
    for path in paths {
        let is_dir = path.ends_with('/');
        let clean = path.trim_end_matches('/');
        let parts: Vec<&str> = clean.split('/').filter(|s| !s.is_empty()).collect();
        if !parts.is_empty() {
            root.add_path(&parts, is_dir);
        }
    }
    root
}

fn render_ascii_tree(node: &TreeNode, prefix: &str, is_last: bool, out: &mut String) {
    let connector = if is_last { "└── " } else { "├── " };
    let suffix = if node.is_dir { "/" } else { "" };
    out.push_str(&format!("{}{}{}{}\n", prefix, connector, node.name, suffix));

    if !node.children.is_empty() {
        let ext = if is_last { "    " } else { "│   " };
        let new_prefix = format!("{}{}", prefix, ext);
        for (i, child) in node.children.iter().enumerate() {
            render_ascii_tree(child, &new_prefix, i == node.children.len() - 1, out);
        }
    }
}

#[derive(Debug)]
pub enum EntryRepositoryError {
    NotDirectory(PathBuf),
    ReadDirFailed { path: PathBuf, source: io::Error },
    ReadEntryFailed { path: PathBuf, source: io::Error },
    DownloadsDirectoryNotFound,
    CreateDownloadsDirectoryFailed { path: PathBuf, source: io::Error },
    WriteFileFailed { path: PathBuf, source: io::Error },
    InvalidUtf8FileName { path: PathBuf },
    GitCommandFailed(String),
    NoReadableSourceFiles,
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
            Self::GitCommandFailed(msg) => {
                write!(f, "git command failed: {msg}")
            }
            Self::NoReadableSourceFiles => {
                write!(f, "no readable source files were found")
            }
        }
    }
}

pub fn get_file_tree<P: AsRef<Path>>(folder_path: P) -> Result<Vec<String>, EntryRepositoryError> {
    let folder_path = folder_path.as_ref();

    if !folder_path.is_dir() {
        return Err(EntryRepositoryError::NotDirectory(
            folder_path.to_path_buf(),
        ));
    }

    let output = Command::new("git")
        .args(["ls-files"])
        .current_dir(folder_path)
        .output()
        .map_err(|err| EntryRepositoryError::GitCommandFailed(err.to_string()))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(EntryRepositoryError::GitCommandFailed(
            stderr.trim().to_string(),
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    let mut root = TreeNode::new("", true);
    for line in stdout.lines().filter(|l| !l.is_empty()) {
        let parts: Vec<&str> = line.split('/').filter(|s| !s.is_empty()).collect();
        if !parts.is_empty() {
            root.add_path(&parts, false);
        }
    }
    root.sort_recursive();

    let mut paths = Vec::new();
    root.to_flat_paths("", &mut paths);
    Ok(paths)
}

pub fn write_file_tree_file<P: AsRef<Path>>(
    folder_path: P,
    tree_paths: &[String],
) -> Result<PathBuf, EntryRepositoryError> {
    let folder_path = folder_path.as_ref();
    let folder_name = folder_path
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| !n.is_empty())
        .unwrap_or("tree");

    let file_name = format!("{}-tree-{}.txt", sanitize_file_name(folder_name), now_str());
    let output_dir = downloads_dir()?;
    fs::create_dir_all(&output_dir).map_err(|err| {
        EntryRepositoryError::CreateDownloadsDirectoryFailed {
            path: output_dir.clone(),
            source: err,
        }
    })?;

    let output_path = output_dir.join(file_name);
    let contents = build_file_tree_text(folder_path, tree_paths);
    fs::write(&output_path, contents).map_err(|err| EntryRepositoryError::WriteFileFailed {
        path: output_path.clone(),
        source: err,
    })?;

    Ok(output_path)
}

fn build_file_tree_text(folder_path: &Path, tree_paths: &[String]) -> String {
    let folder_name = folder_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(".");

    let mut root = build_tree_from_paths(folder_name, tree_paths);
    root.sort_recursive();

    let file_count = tree_paths.iter().filter(|p| !p.ends_with('/')).count();
    let dir_count = tree_paths.iter().filter(|p| p.ends_with('/')).count();

    let mut out = String::new();
    out.push_str(&format!("{}/\n", root.name));
    for (i, child) in root.children.iter().enumerate() {
        render_ascii_tree(child, "", i == root.children.len() - 1, &mut out);
    }
    out.push('\n');
    out.push_str(&format!(
        "{} directories, {} files\n",
        dir_count, file_count
    ));
    out
}

const SOURCE_CHUNK_CHARS: usize = 30_000;

pub struct SourceExportResult {
    pub output_paths: Vec<PathBuf>,
    pub skipped_paths: Vec<String>,
}

pub fn write_source_file<P: AsRef<Path>>(
    folder_path: P,
    file_paths: &[String],
) -> Result<SourceExportResult, EntryRepositoryError> {
    let folder_path = folder_path.as_ref();
    let folder_name = folder_path
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| !n.is_empty())
        .unwrap_or("source");

    let output_dir = downloads_dir()?;
    fs::create_dir_all(&output_dir).map_err(|err| {
        EntryRepositoryError::CreateDownloadsDirectoryFailed {
            path: output_dir.clone(),
            source: err,
        }
    })?;

    let (chunks, skipped_paths) = build_source_chunks(folder_path, file_paths);
    if chunks.is_empty() {
        return Err(EntryRepositoryError::NoReadableSourceFiles);
    }

    let ts = now_str();
    let base = sanitize_file_name(folder_name);
    let mut output_paths = Vec::new();

    for (i, chunk) in chunks.iter().enumerate() {
        let file_name = if chunks.len() == 1 {
            format!("{}-source-{}.txt", base, ts)
        } else {
            format!("{}-source-{}-{}.txt", base, ts, i + 1)
        };
        let output_path = output_dir.join(file_name);
        fs::write(&output_path, chunk).map_err(|err| EntryRepositoryError::WriteFileFailed {
            path: output_path.clone(),
            source: err,
        })?;
        output_paths.push(output_path);
    }

    Ok(SourceExportResult {
        output_paths,
        skipped_paths,
    })
}

fn build_source_chunks(folder_path: &Path, file_paths: &[String]) -> (Vec<String>, Vec<String>) {
    let mut chunks: Vec<String> = Vec::new();
    let mut current = String::new();
    let mut skipped_paths = Vec::new();

    for rel_path in file_paths {
        if rel_path.ends_with('/') {
            continue;
        }
        let full_path = folder_path.join(rel_path);
        let content = match fs::read_to_string(&full_path) {
            Ok(c) => c,
            Err(_) => {
                skipped_paths.push(rel_path.clone());
                continue;
            }
        };

        let mut entry = format!("=== {} ===\n", rel_path);
        entry.push_str(&content);
        if !content.ends_with('\n') {
            entry.push('\n');
        }
        entry.push('\n');

        // ファイル境界で分割 — 現在のチャンクが空でなく、追加すると超過する場合はフラッシュ
        if !current.is_empty()
            && current.chars().count() + entry.chars().count() > SOURCE_CHUNK_CHARS
        {
            chunks.push(std::mem::take(&mut current));
        }

        current.push_str(&entry);
    }

    if !current.is_empty() {
        chunks.push(current);
    }

    (chunks, skipped_paths)
}

pub fn count_source_chars<P: AsRef<Path>>(folder_path: P, file_paths: &[String]) -> usize {
    let folder_path = folder_path.as_ref();
    let mut total = 0usize;
    for rel_path in file_paths {
        if rel_path.ends_with('/') {
            continue;
        }
        let full_path = folder_path.join(rel_path);
        if let Ok(content) = fs::read_to_string(&full_path) {
            total += content.chars().count();
        }
    }
    total
}

pub fn get_git_diff<P: AsRef<Path>>(folder_path: P) -> Result<String, EntryRepositoryError> {
    let folder_path = folder_path.as_ref();

    if !folder_path.is_dir() {
        return Err(EntryRepositoryError::NotDirectory(
            folder_path.to_path_buf(),
        ));
    }

    let output = Command::new("git")
        .args(["diff", "HEAD"])
        .current_dir(folder_path)
        .output()
        .map_err(|err| EntryRepositoryError::GitCommandFailed(err.to_string()))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(EntryRepositoryError::GitCommandFailed(
            stderr.trim().to_string(),
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

pub fn write_git_diff_file<P: AsRef<Path>>(
    folder_path: P,
    diff: &str,
) -> Result<PathBuf, EntryRepositoryError> {
    let folder_path = folder_path.as_ref();
    let folder_name = folder_path
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| !n.is_empty())
        .unwrap_or("diff");

    let file_name = format!("{}-diff-{}.txt", sanitize_file_name(folder_name), now_str());
    let output_dir = downloads_dir()?;
    fs::create_dir_all(&output_dir).map_err(|err| {
        EntryRepositoryError::CreateDownloadsDirectoryFailed {
            path: output_dir.clone(),
            source: err,
        }
    })?;

    let output_path = output_dir.join(file_name);
    fs::write(&output_path, diff).map_err(|err| EntryRepositoryError::WriteFileFailed {
        path: output_path.clone(),
        source: err,
    })?;

    Ok(output_path)
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
    let file_name = format!(
        "{}-entries-{}.txt",
        sanitize_file_name(folder_name),
        now_str()
    );
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
