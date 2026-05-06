use serde::Serialize;
use serde_json::Value;
use std::io::Read;
use std::path::{Component, Path, PathBuf};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};

const ALLOWED_CMDS: &[&str] = &[
    "cat", "dir", "echo", "head", "ls", "pwd", "rg", "tail", "wc",
];
const CMD_OUTPUT_LIMIT_BYTES: usize = 64 * 1024;

#[derive(Serialize, Clone, Debug)]
pub struct ActionResult {
    pub action_type: String,
    pub label: String,
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}

impl ActionResult {
    fn ok(
        action_type: impl Into<String>,
        label: impl Into<String>,
        output: impl Into<String>,
    ) -> Self {
        Self {
            action_type: action_type.into(),
            label: label.into(),
            success: true,
            output: output.into(),
            error: None,
        }
    }

    fn fail(
        action_type: impl Into<String>,
        label: impl Into<String>,
        output: impl Into<String>,
        error: impl Into<String>,
    ) -> Self {
        Self {
            action_type: action_type.into(),
            label: label.into(),
            success: false,
            output: output.into(),
            error: Some(error.into()),
        }
    }
}

fn is_safe_rel(path: &str) -> bool {
    if path.contains('\0') || path.contains('\\') {
        return false;
    }
    if path.len() >= 2 && path.as_bytes()[1] == b':' {
        return false;
    }

    let path = Path::new(path);
    if path.as_os_str().is_empty() || path.is_absolute() {
        return false;
    }

    path.components()
        .all(|component| matches!(component, Component::Normal(_) | Component::CurDir))
}

fn validate_relative(relative: &str) -> Result<&Path, String> {
    if !is_safe_rel(relative) {
        return Err(format!("Unsafe path rejected: {relative:?}"));
    }
    Ok(Path::new(relative))
}

fn canonical_base(base: &Path) -> Result<PathBuf, String> {
    base.canonicalize()
        .map_err(|e| format!("Failed to resolve workspace path {}: {e}", base.display()))
}

fn safe_existing_path(base: &Path, relative: &str) -> Result<PathBuf, String> {
    let relative = validate_relative(relative)?;
    let base = canonical_base(base)?;
    let target = base.join(relative);
    let canonical = target
        .canonicalize()
        .map_err(|e| format!("Failed to resolve path {}: {e}", target.display()))?;

    if !canonical.starts_with(&base) {
        return Err(format!("Path escapes workspace: {}", target.display()));
    }

    Ok(canonical)
}

fn safe_create_path(base: &Path, relative: &str) -> Result<PathBuf, String> {
    let relative = validate_relative(relative)?;
    let base = canonical_base(base)?;
    let target = base.join(relative);
    let parent = target.parent().unwrap_or(&base);
    std::fs::create_dir_all(parent)
        .map_err(|e| format!("Failed to create parent dirs {}: {e}", parent.display()))?;
    let parent = parent
        .canonicalize()
        .map_err(|e| format!("Failed to resolve parent path {}: {e}", parent.display()))?;

    if !parent.starts_with(&base) {
        return Err(format!("Path escapes workspace: {}", target.display()));
    }

    if target.exists() {
        let canonical = target
            .canonicalize()
            .map_err(|e| format!("Failed to resolve path {}: {e}", target.display()))?;
        if !canonical.starts_with(&base) {
            return Err(format!("Path escapes workspace: {}", target.display()));
        }
    }

    Ok(target)
}

fn safe_dir_path(base: &Path, relative: &str) -> Result<PathBuf, String> {
    let target = safe_create_path(base, relative)?;
    std::fs::create_dir_all(&target)
        .map_err(|e| format!("Failed to create directory {}: {e}", target.display()))?;
    let base = canonical_base(base)?;
    let canonical = target
        .canonicalize()
        .map_err(|e| format!("Failed to resolve directory {}: {e}", target.display()))?;

    if !canonical.starts_with(&base) {
        return Err(format!("Path escapes workspace: {}", target.display()));
    }

    Ok(canonical)
}

pub fn execute_json(
    json: &str,
    workspace_root: &Path,
    base_dir: Option<&Path>,
) -> Result<Vec<ActionResult>, String> {
    let parsed: Value = serde_json::from_str(json).map_err(|e| format!("JSON parse error: {e}"))?;

    let actions: Vec<&Value> = match &parsed {
        Value::Array(arr) => arr.iter().collect(),
        obj @ Value::Object(_) => vec![obj],
        _ => return Err("JSON must be an object or array of objects".into()),
    };

    Ok(actions
        .iter()
        .map(|a| execute_action(a, workspace_root, base_dir))
        .collect())
}

fn execute_action(action: &Value, workspace_root: &Path, base_dir: Option<&Path>) -> ActionResult {
    let action_type = action["type"].as_str().unwrap_or("unknown").to_string();
    let workspace = workspace_root.join("ai_workspace");

    match action_type.as_str() {
        "txt" => {
            let content = action["content"].as_str().unwrap_or("").to_string();
            ActionResult::ok("txt", "txt", content)
        }
        "bot" | "error" => {
            let content = action["content"]
                .as_str()
                .or_else(|| action["message"].as_str())
                .unwrap_or("")
                .to_string();
            ActionResult::ok(&action_type, &action_type, content)
        }
        "cmd" => do_cmd(action, &workspace, base_dir),
        "file" => do_file(action, &workspace),
        "mkdir" => do_mkdir(action, &workspace),
        "delete_file" => do_delete_file(action, &workspace),
        "delete_folder" => do_delete_folder(action, &workspace),
        "read_file" => do_read_file(action, workspace_root, base_dir),
        "read_log" => do_read_log(action, workspace_root),
        "patch" => do_patch(action, &workspace),
        _ => ActionResult::fail(
            "unknown",
            &action_type,
            "",
            format!("Unknown action type: {action_type}"),
        ),
    }
}

// ── cmd ────────────────────────────────────────────────────────────────────

fn do_cmd(action: &Value, workspace: &Path, base_dir: Option<&Path>) -> ActionResult {
    let name = action["name"].as_str().unwrap_or("cmd").to_string();
    let label = format!("cmd:{name}");
    let timeout_secs = action["timeout"].as_u64().unwrap_or(30);
    let workdir_rel = action["workdir"].as_str().unwrap_or("");

    let cmd_arr: Vec<String> = match action["cmd"].as_array() {
        Some(arr) => arr
            .iter()
            .filter_map(|v| v.as_str().map(str::to_string))
            .collect(),
        None => return ActionResult::fail("cmd", &label, "", "cmd field must be a JSON array"),
    };

    if cmd_arr.is_empty() {
        return ActionResult::fail("cmd", &label, "", "cmd array is empty");
    }

    let program = &cmd_arr[0];
    let base_name = Path::new(program)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(program.as_str());

    if !ALLOWED_CMDS.contains(&base_name) {
        return ActionResult::fail(
            "cmd",
            &label,
            "",
            format!(
                "Command '{program}' is not allowed. Allowed commands: {}",
                ALLOWED_CMDS.join(", ")
            ),
        );
    }

    if let Err(e) = validate_cmd_args(&cmd_arr[1..]) {
        return ActionResult::fail("cmd", &label, "", e);
    }

    // workdir priority: action["workdir"] > base_dir > ai_workspace
    let exec_dir = if !workdir_rel.is_empty() {
        match safe_existing_path(workspace, workdir_rel) {
            Ok(p) => p,
            Err(e) => return ActionResult::fail("cmd", &label, "", e),
        }
    } else if let Some(bd) = base_dir {
        bd.to_path_buf()
    } else {
        workspace.to_path_buf()
    };

    if !exec_dir.exists() {
        return ActionResult::fail(
            "cmd",
            &label,
            "",
            format!("workdir does not exist: {}", exec_dir.display()),
        );
    }

    let (success, output) = run_with_timeout(program, &cmd_arr[1..], &exec_dir, timeout_secs);

    if success {
        ActionResult::ok("cmd", label, output)
    } else {
        ActionResult::fail("cmd", label, output, "Command exited with error")
    }
}

fn validate_cmd_args(args: &[String]) -> Result<(), String> {
    for arg in args {
        if arg.contains('\0') {
            return Err("Command arguments cannot contain null bytes".to_string());
        }

        if arg.starts_with('-') {
            continue;
        }

        let looks_like_path =
            arg.contains('/') || arg.contains('\\') || Path::new(arg).is_absolute();
        if looks_like_path && !is_safe_rel(arg) {
            return Err(format!("Unsafe command argument rejected: {arg:?}"));
        }
    }

    Ok(())
}

fn run_with_timeout(
    program: &str,
    args: &[String],
    workdir: &Path,
    timeout_secs: u64,
) -> (bool, String) {
    use std::process::{Command, Stdio};

    let mut child = match Command::new(program)
        .args(args)
        .current_dir(workdir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => return (false, format!("Failed to start '{program}': {e}")),
    };

    let stdout_pipe = child.stdout.take().expect("stdout piped");
    let stderr_pipe = child.stderr.take().expect("stderr piped");

    let (tx_out, rx_out) = mpsc::channel::<(Vec<u8>, bool)>();
    let (tx_err, rx_err) = mpsc::channel::<(Vec<u8>, bool)>();

    thread::spawn(move || {
        tx_out.send(read_limited(stdout_pipe)).ok();
    });
    thread::spawn(move || {
        tx_err.send(read_limited(stderr_pipe)).ok();
    });

    let start = Instant::now();
    let mut exit_success = false;

    let timed_out = loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                exit_success = status.success();
                break false;
            }
            Ok(None) if start.elapsed() >= Duration::from_secs(timeout_secs) => {
                let _ = child.kill();
                let _ = child.wait();
                break true;
            }
            Ok(None) => thread::sleep(Duration::from_millis(100)),
            Err(e) => {
                let _ = child.kill();
                let _ = child.wait();
                eprintln!("[agent/cmd] try_wait error: {e}");
                break true;
            }
        }
    };

    let collect_timeout = Duration::from_secs(5);
    let (stdout_bytes, stdout_truncated) = rx_out.recv_timeout(collect_timeout).unwrap_or_default();
    let (stderr_bytes, stderr_truncated) = rx_err.recv_timeout(collect_timeout).unwrap_or_default();

    let mut stdout = String::from_utf8_lossy(&stdout_bytes).into_owned();
    let mut stderr = String::from_utf8_lossy(&stderr_bytes).into_owned();
    if stdout_truncated {
        stdout.push_str(&format!(
            "\n[stdout truncated after {} bytes]",
            CMD_OUTPUT_LIMIT_BYTES
        ));
    }
    if stderr_truncated {
        stderr.push_str(&format!(
            "\n[stderr truncated after {} bytes]",
            CMD_OUTPUT_LIMIT_BYTES
        ));
    }

    let output = if timed_out {
        format!(
            "[TIMEOUT after {timeout_secs}s]\n{stdout}{}",
            if stderr.is_empty() {
                String::new()
            } else {
                format!("\n{stderr}")
            }
        )
    } else {
        format!(
            "{stdout}{}",
            if stderr.is_empty() {
                String::new()
            } else {
                format!("\n{stderr}")
            }
        )
    };

    (!timed_out && exit_success, output)
}

fn read_limited<R: Read>(mut reader: R) -> (Vec<u8>, bool) {
    let mut buf = Vec::new();
    let mut limited = (&mut reader).take((CMD_OUTPUT_LIMIT_BYTES + 1) as u64);
    limited.read_to_end(&mut buf).ok();
    let truncated = buf.len() > CMD_OUTPUT_LIMIT_BYTES;
    if truncated {
        buf.truncate(CMD_OUTPUT_LIMIT_BYTES);
    }
    (buf, truncated)
}

// ── file ───────────────────────────────────────────────────────────────────

fn do_file(action: &Value, workspace: &Path) -> ActionResult {
    let path_str = match action["path"].as_str() {
        Some(p) => p,
        None => return ActionResult::fail("file", "file", "", "Missing 'path' field"),
    };
    let content = action["content"].as_str().unwrap_or("");

    let target = match safe_create_path(workspace, path_str) {
        Ok(p) => p,
        Err(e) => return ActionResult::fail("file", format!("file:{path_str}"), "", e),
    };

    match std::fs::write(&target, content) {
        Ok(_) => ActionResult::ok(
            "file",
            format!("file:{path_str}"),
            format!("Written: {}", target.display()),
        ),
        Err(e) => ActionResult::fail(
            "file",
            format!("file:{path_str}"),
            "",
            format!("Write failed: {e}"),
        ),
    }
}

// ── mkdir ──────────────────────────────────────────────────────────────────

fn do_mkdir(action: &Value, workspace: &Path) -> ActionResult {
    let path_str = match action["path"].as_str() {
        Some(p) => p,
        None => return ActionResult::fail("mkdir", "mkdir", "", "Missing 'path' field"),
    };

    let target = match safe_dir_path(workspace, path_str) {
        Ok(p) => p,
        Err(e) => return ActionResult::fail("mkdir", format!("mkdir:{path_str}"), "", e),
    };

    ActionResult::ok(
        "mkdir",
        format!("mkdir:{path_str}"),
        format!("Created: {}", target.display()),
    )
}

// ── delete_file ────────────────────────────────────────────────────────────

fn do_delete_file(action: &Value, workspace: &Path) -> ActionResult {
    let path_str = match action["path"].as_str() {
        Some(p) => p,
        None => {
            return ActionResult::fail("delete_file", "delete_file", "", "Missing 'path' field")
        }
    };

    let target = match safe_existing_path(workspace, path_str) {
        Ok(p) => p,
        Err(e) => {
            return ActionResult::fail("delete_file", format!("delete_file:{path_str}"), "", e)
        }
    };

    match std::fs::remove_file(&target) {
        Ok(_) => ActionResult::ok(
            "delete_file",
            format!("delete_file:{path_str}"),
            format!("Deleted: {path_str}"),
        ),
        Err(e) => ActionResult::fail(
            "delete_file",
            format!("delete_file:{path_str}"),
            "",
            format!("Delete failed: {e}"),
        ),
    }
}

// ── delete_folder ──────────────────────────────────────────────────────────

fn do_delete_folder(action: &Value, workspace: &Path) -> ActionResult {
    let path_str = match action["path"].as_str() {
        Some(p) => p,
        None => {
            return ActionResult::fail("delete_folder", "delete_folder", "", "Missing 'path' field")
        }
    };

    let target = match safe_existing_path(workspace, path_str) {
        Ok(p) => p,
        Err(e) => {
            return ActionResult::fail("delete_folder", format!("delete_folder:{path_str}"), "", e)
        }
    };

    match std::fs::remove_dir_all(&target) {
        Ok(_) => ActionResult::ok(
            "delete_folder",
            format!("delete_folder:{path_str}"),
            format!("Deleted: {path_str}"),
        ),
        Err(e) => ActionResult::fail(
            "delete_folder",
            format!("delete_folder:{path_str}"),
            "",
            format!("Delete failed: {e}"),
        ),
    }
}

// ── read_file ──────────────────────────────────────────────────────────────

fn do_read_file(action: &Value, workspace_root: &Path, base_dir: Option<&Path>) -> ActionResult {
    let path_str = match action["path"].as_str() {
        Some(p) => p,
        None => return ActionResult::fail("read_file", "read_file", "", "Missing 'path' field"),
    };

    // Search order: base_dir (if set and path is safe-relative), then ai_readonly
    let candidates: Vec<PathBuf> = {
        let mut v = Vec::new();
        if let Some(bd) = base_dir {
            if is_safe_rel(path_str) {
                v.push(bd.join(path_str));
            }
        }
        if let Ok(p) = safe_existing_path(&workspace_root.join("ai_readonly"), path_str) {
            v.push(p);
        }
        v
    };

    for candidate in &candidates {
        if candidate.exists() {
            return match std::fs::read_to_string(candidate) {
                Ok(content) => {
                    ActionResult::ok("read_file", format!("read_file:{path_str}"), content)
                }
                Err(e) => ActionResult::fail(
                    "read_file",
                    format!("read_file:{path_str}"),
                    "",
                    format!("Read failed: {e}"),
                ),
            };
        }
    }

    let searched: Vec<String> = candidates.iter().map(|p| p.display().to_string()).collect();
    ActionResult::fail(
        "read_file",
        format!("read_file:{path_str}"),
        "",
        format!("File not found. Searched:\n{}", searched.join("\n")),
    )
}

// ── read_log ───────────────────────────────────────────────────────────────

fn do_read_log(action: &Value, workspace_root: &Path) -> ActionResult {
    let filename = match action["filename"].as_str() {
        Some(f) => f,
        None => return ActionResult::fail("read_log", "read_log", "", "Missing 'filename' field"),
    };

    if !is_safe_rel(filename) {
        return ActionResult::fail(
            "read_log",
            format!("read_log:{filename}"),
            "",
            "Unsafe filename",
        );
    }

    for dir in &["ai_log", "cmd_log", "ai_readonly"] {
        let candidate = match safe_existing_path(&workspace_root.join(dir), filename) {
            Ok(path) => path,
            Err(_) => continue,
        };
        if candidate.exists() {
            return match std::fs::read_to_string(&candidate) {
                Ok(content) => {
                    ActionResult::ok("read_log", format!("read_log:{filename}"), content)
                }
                Err(e) => ActionResult::fail(
                    "read_log",
                    format!("read_log:{filename}"),
                    "",
                    format!("Read failed: {e}"),
                ),
            };
        }
    }

    ActionResult::fail(
        "read_log",
        format!("read_log:{filename}"),
        "",
        format!("File not found in ai_log / cmd_log / ai_readonly: {filename}"),
    )
}

// ── patch ──────────────────────────────────────────────────────────────────

fn do_patch(action: &Value, workspace: &Path) -> ActionResult {
    let path_str = match action["path"].as_str() {
        Some(p) => p,
        None => return ActionResult::fail("patch", "patch", "", "Missing 'path' field"),
    };
    let diff_content = match action["diff"].as_str() {
        Some(d) => d,
        None => {
            return ActionResult::fail(
                "patch",
                format!("patch:{path_str}"),
                "",
                "Missing 'diff' field",
            )
        }
    };

    let target = match safe_existing_path(workspace, path_str) {
        Ok(p) => p,
        Err(e) => return ActionResult::fail("patch", format!("patch:{path_str}"), "", e),
    };

    let original = match std::fs::read_to_string(&target) {
        Ok(s) => s,
        Err(e) => {
            return ActionResult::fail(
                "patch",
                format!("patch:{path_str}"),
                "",
                format!("Cannot read target file: {e}"),
            )
        }
    };

    // Add file headers if only a bare hunk was provided
    let patch_input = if diff_content.trim_start().starts_with("@@") {
        format!("--- {path_str}\n+++ {path_str}\n{diff_content}\n")
    } else {
        format!("{diff_content}\n")
    };

    let patch = match diffy::Patch::from_str(&patch_input) {
        Ok(p) => p,
        Err(e) => {
            return ActionResult::fail(
                "patch",
                format!("patch:{path_str}"),
                "",
                format!("Invalid patch format: {e}"),
            )
        }
    };

    let patched = match diffy::apply(&original, &patch) {
        Ok(s) => s,
        Err(e) => {
            return ActionResult::fail(
                "patch",
                format!("patch:{path_str}"),
                "",
                format!("Patch apply failed: {e}"),
            )
        }
    };

    match std::fs::write(&target, &patched) {
        Ok(_) => ActionResult::ok(
            "patch",
            format!("patch:{path_str}"),
            format!("Patched: {path_str}"),
        ),
        Err(e) => ActionResult::fail(
            "patch",
            format!("patch:{path_str}"),
            "",
            format!("Write failed after patch: {e}"),
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(name: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after unix epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "code-to-prompt-agent-{name}-{}-{nanos}",
            std::process::id()
        ));
        fs::create_dir_all(&path).expect("failed to create temp dir");
        path
    }

    fn init_test_workspace(name: &str) -> PathBuf {
        let root = temp_dir(name);
        crate::agent::init_workspace(&root).expect("failed to init agent workspace");
        root
    }

    #[test]
    fn cmd_rejects_shell_escape() {
        let root = init_test_workspace("shell-block");
        let results = execute_json(
            r#"[{"type":"cmd","name":"shell","cmd":["sh","-c","echo unsafe"]}]"#,
            &root,
            None,
        )
        .expect("json should parse");

        assert_eq!(results.len(), 1);
        assert!(!results[0].success);
        assert!(results[0]
            .error
            .as_deref()
            .unwrap_or_default()
            .contains("not allowed"));
        fs::remove_dir_all(root).expect("failed to remove temp dir");
    }

    #[test]
    fn cmd_output_is_truncated() {
        let root = init_test_workspace("output-limit");
        let workspace = root.join("ai_workspace");
        fs::write(
            workspace.join("large.txt"),
            "a".repeat(CMD_OUTPUT_LIMIT_BYTES + 1024),
        )
        .expect("failed to write large file");

        let results = execute_json(
            r#"[{"type":"cmd","name":"cat-large","cmd":["cat","large.txt"]}]"#,
            &root,
            None,
        )
        .expect("json should parse");

        assert_eq!(results.len(), 1);
        assert!(results[0].success);
        assert!(results[0].output.contains("[stdout truncated after"));
        assert!(results[0].output.len() < CMD_OUTPUT_LIMIT_BYTES + 256);
        fs::remove_dir_all(root).expect("failed to remove temp dir");
    }

    #[cfg(unix)]
    #[test]
    fn file_write_rejects_symlink_escape() {
        use std::os::unix::fs::symlink;

        let root = init_test_workspace("symlink-write");
        let outside_dir = temp_dir("symlink-outside");
        let outside_file = outside_dir.join("outside.txt");
        fs::write(&outside_file, "outside").expect("failed to write outside file");
        symlink(&outside_file, root.join("ai_workspace/link.txt"))
            .expect("failed to create symlink");

        let results = execute_json(
            r#"[{"type":"file","path":"link.txt","content":"changed"}]"#,
            &root,
            None,
        )
        .expect("json should parse");

        assert_eq!(results.len(), 1);
        assert!(!results[0].success);
        assert_eq!(
            fs::read_to_string(&outside_file).expect("failed to read outside file"),
            "outside"
        );
        fs::remove_dir_all(root).expect("failed to remove temp dir");
        fs::remove_dir_all(outside_dir).expect("failed to remove outside temp dir");
    }
}
