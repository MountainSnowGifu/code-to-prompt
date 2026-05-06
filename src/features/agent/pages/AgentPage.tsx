import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { initAgentWorkspace, executeJson } from "../api/agentApi";
import type { ActionResult } from "../types/agent";
import { MatrixRain } from "../../entry/components/MatrixRain";
import { useThemeMode } from "../../../app/providers/AppThemeProvider";
import { pickFolder, revealPathInFileManager } from "../../../shared/lib/tauri";

interface Props {
  onCodeNav: () => void;
}

function ThemeModeIcon({ mode }: { mode: "dark" | "light" }) {
  if (mode === "dark") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4.5a1 1 0 0 1 1 1V7a1 1 0 1 1-2 0V5.5a1 1 0 0 1 1-1Zm0 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.5-4.5a1 1 0 1 1 0 2H18a1 1 0 1 1 0-2h1.5ZM6 12a1 1 0 0 1-1 1H3.5a1 1 0 1 1 0-2H5a1 1 0 0 1 1 1Zm10.95-5.95a1 1 0 0 1 1.41 1.41l-1.06 1.06a1 1 0 1 1-1.41-1.41l1.06-1.06ZM8.11 15.89a1 1 0 0 1 0 1.41l-1.06 1.06a1 1 0 0 1-1.41-1.41l1.06-1.06a1 1 0 0 1 1.41 0Zm10.25 1.06a1 1 0 1 1-1.41 1.41l-1.06-1.06a1 1 0 1 1 1.41-1.41l1.06 1.06ZM8.11 8.52a1 1 0 0 1-1.41 0L5.64 7.46a1 1 0 0 1 1.41-1.41l1.06 1.06a1 1 0 0 1 0 1.41ZM12 17a1 1 0 0 1 1 1v1.5a1 1 0 1 1-2 0V18a1 1 0 0 1 1-1Z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 14.2A8 8 0 0 1 9.8 3a1 1 0 0 0-1.1-1.4A10 10 0 1 0 22.4 15.3a1 1 0 0 0-1.4-1.1ZM12 20a8 8 0 0 1-5.6-13.7 10 10 0 0 0 11.3 11.3A8 8 0 0 1 12 20Z" />
    </svg>
  );
}

function typeColor(actionType: string, success: boolean): string {
  if (!success) return "error.main";
  switch (actionType) {
    case "txt":
    case "bot":
      return "primary.main";
    case "cmd":
      return "success.main";
    case "file":
    case "mkdir":
      return "info.main";
    case "delete_file":
    case "delete_folder":
      return "warning.main";
    case "read_file":
    case "read_log":
      return "text.secondary";
    case "patch":
      return "secondary.main";
    case "error":
      return "error.main";
    default:
      return "text.primary";
  }
}

function FolderOpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
    </svg>
  );
}

function ResultCard({ result }: { result: ActionResult }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(true);
  const hasOutput = result.output.trim().length > 0;
  const isMonospace = ["cmd", "read_file", "read_log", "patch", "file", "mkdir"].includes(
    result.action_type,
  );

  return (
    <Box
      sx={{
        borderLeft: "2px solid",
        borderColor: typeColor(result.action_type, result.success),
        pl: 1.5,
        py: 0.5,
        mb: 1,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: hasOutput ? 0.5 : 0 }}>
        <Chip
          label={result.label}
          size="small"
          color={result.success ? "default" : "error"}
          sx={{
            fontFamily: "monospace",
            fontSize: "0.72rem",
            height: 20,
            bgcolor: result.success
              ? theme.palette.mode === "dark"
                ? "rgba(143,240,178,0.12)"
                : "rgba(0,107,58,0.08)"
              : undefined,
            color: typeColor(result.action_type, result.success),
          }}
        />
        {result.error && (
          <Typography sx={{ fontSize: "0.75rem", color: "error.main" }}>{result.error}</Typography>
        )}
        {hasOutput && (
          <Button
            size="small"
            onClick={() => setExpanded((v) => !v)}
            sx={{ minWidth: 0, px: 0.5, fontSize: "0.68rem", color: "text.secondary" }}
          >
            {expanded ? "▲" : "▼"}
          </Button>
        )}
      </Stack>

      {expanded && hasOutput && (
        <Box
          sx={{
            mt: 0.5,
            p: 1,
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(0,6,2,0.8)"
                : "rgba(251,255,252,0.85)",
            borderRadius: 0.5,
            fontFamily: isMonospace ? "monospace" : "inherit",
            fontSize: "0.8rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: result.success ? "text.primary" : "error.light",
            maxHeight: 320,
            overflow: "auto",
          }}
        >
          {result.output}
        </Box>
      )}
    </Box>
  );
}

function resultsToText(results: ActionResult[]): string {
  return results
    .map((r) => {
      const status = r.success ? "OK" : "FAIL";
      const lines = [`[${status}] ${r.label}`];
      if (r.error) lines.push(`ERROR: ${r.error}`);
      if (r.output.trim()) lines.push(r.output.trim());
      return lines.join("\n");
    })
    .join("\n---\n");
}

export function AgentPage({ onCodeNav }: Props) {
  const theme = useTheme();
  const { mode, toggleMode } = useThemeMode();
  const [rainEnabled, setRainEnabled] = useState(true);
  const [workspacePath, setWorkspacePath] = useState("");
  const [baseDir, setBaseDir] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [results, setResults] = useState<ActionResult[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initAgentWorkspace()
      .then(setWorkspacePath)
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [results]);

  async function handleExecute() {
    if (!jsonInput.trim()) return;
    setError("");
    setIsExecuting(true);
    try {
      const newResults = await executeJson(jsonInput.trim(), baseDir.trim() || undefined);
      setResults((prev) => [...prev, ...newResults]);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsExecuting(false);
    }
  }

  async function handleCopyResults() {
    if (results.length === 0) return;
    try {
      await navigator.clipboard.writeText(resultsToText(results));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("クリップボードにコピーできませんでした。");
    }
  }

  function handleFormatJson() {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed, null, 2));
    } catch {
      setError("Invalid JSON — cannot format");
    }
  }

  return (
    <Box
      className={`matrix-shell matrix-shell-${theme.palette.mode}`}
      component="main"
      sx={{
        minHeight: "100vh",
        py: { xs: 3, sm: 4 },
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(180deg, rgba(0, 19, 8, 0.72), rgba(0, 0, 0, 0.96))"
            : "linear-gradient(180deg, rgba(238, 250, 241, 0.7), rgba(220, 239, 226, 0.94))",
      }}
    >
      {rainEnabled && <MatrixRain />}
      <Container maxWidth="md">
        <Stack spacing={3}>
          {/* Header */}
          <Box
            component="header"
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 2,
              borderLeft: "2px solid",
              borderColor: "primary.main",
              pl: 2,
              textShadow:
                theme.palette.mode === "dark"
                  ? "0 0 16px rgba(143, 240, 178, 0.34)"
                  : "0 0 12px rgba(0, 107, 58, 0.12)",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                component="p"
                sx={{
                  mb: 1,
                  color: "primary.main",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                $ ubuntu-ai
              </Typography>
              <Typography
                component="h1"
                variant="h4"
                sx={{
                  color: "text.primary",
                  fontWeight: 900,
                  textShadow:
                    theme.palette.mode === "dark"
                      ? "0 0 22px rgba(143, 240, 178, 0.42)"
                      : "0 0 14px rgba(0, 107, 58, 0.16)",
                }}
              >
                Agent Executor
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
              <Tooltip title="Switch to Code to Prompt">
                <Button
                  onClick={onCodeNav}
                  size="small"
                  variant="outlined"
                  sx={{ minWidth: 72, height: 32, px: 1.25, fontSize: "0.72rem" }}
                >
                  CODE
                </Button>
              </Tooltip>
              <Tooltip title={rainEnabled ? "Hide matrix rain" : "Show matrix rain"}>
                <Button
                  aria-pressed={rainEnabled}
                  onClick={() => setRainEnabled((v) => !v)}
                  size="small"
                  variant={rainEnabled ? "contained" : "outlined"}
                  sx={{ minWidth: 88, height: 32, px: 1.25, fontSize: "0.72rem" }}
                >
                  {rainEnabled ? "RAIN ON" : "RAIN OFF"}
                </Button>
              </Tooltip>
              <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
                <IconButton
                  aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  onClick={toggleMode}
                  size="small"
                  sx={{
                    flexShrink: 0,
                    color: "primary.main",
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                  }}
                >
                  <ThemeModeIcon mode={mode} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* Workspace path */}
          {workspacePath && (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", pl: 0.5 }}>
              <Typography
                sx={{ fontSize: "0.72rem", color: "text.secondary", fontFamily: "monospace", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                workspace: {workspacePath}/ai_workspace
              </Typography>
              <Tooltip title="ai_workspace をファイルマネージャーで開く">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => revealPathInFileManager(`${workspacePath}/ai_workspace`)}
                  sx={{ fontSize: "0.7rem", minWidth: 80, flexShrink: 0 }}
                >
                  Open folder
                </Button>
              </Tooltip>
            </Stack>
          )}

          {/* Base directory (current dir for read_file / cmd) */}
          <Paper
            elevation={0}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 1,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.76rem",
                fontWeight: 700,
                color: "primary.main",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                flexShrink: 0,
              }}
            >
              $ cwd
            </Typography>
            <TextField
              value={baseDir}
              onChange={(e) => setBaseDir(e.currentTarget.value)}
              placeholder="/path/to/project  (read_file / cmd のベースディレクトリ)"
              size="small"
              fullWidth
              disabled={isExecuting}
              sx={{
                "& .MuiInputBase-root": { fontFamily: "monospace", fontSize: "0.8rem" },
              }}
            />
            <Tooltip title="フォルダを選択">
              <IconButton
                onClick={async () => {
                  const selected = await pickFolder();
                  if (selected) setBaseDir(selected);
                }}
                size="small"
                disabled={isExecuting}
                sx={{ color: "primary.main", border: "1px solid", borderColor: "divider", flexShrink: 0 }}
              >
                <FolderOpenIcon />
              </IconButton>
            </Tooltip>
          </Paper>

          {/* Error */}
          {error && (
            <Alert severity="error" variant="outlined" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {/* JSON input area */}
          <Paper
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              overflow: "hidden",
              position: "relative",
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 0,
                borderTop: "1px solid",
                borderColor:
                  theme.palette.mode === "dark"
                    ? "rgba(178, 245, 199, 0.42)"
                    : "rgba(0, 107, 58, 0.22)",
                pointerEvents: "none",
              },
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                px: 2,
                py: 1,
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography sx={{ fontWeight: 700, flex: 1 }}>$ json-input</Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={handleFormatJson}
                disabled={!jsonInput.trim() || isExecuting}
                sx={{ fontSize: "0.72rem", minWidth: 72 }}
              >
                Format
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setJsonInput("")}
                disabled={!jsonInput || isExecuting}
                sx={{ fontSize: "0.72rem", minWidth: 56 }}
              >
                Clear
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleExecute}
                disabled={!jsonInput.trim() || isExecuting}
                sx={{ minWidth: 80, fontSize: "0.78rem" }}
              >
                {isExecuting ? <CircularProgress color="inherit" size={18} /> : "Execute"}
              </Button>
            </Stack>
            <TextField
              multiline
              fullWidth
              minRows={6}
              maxRows={16}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.currentTarget.value)}
              placeholder={'[\n  {\n    "type": "txt",\n    "content": "Hello from ubuntu-ai"\n  }\n]'}
              disabled={isExecuting}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleExecute();
                }
              }}
              sx={{
                "& .MuiInputBase-root": {
                  fontFamily: "monospace",
                  fontSize: "0.82rem",
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(0,6,2,0.9)"
                      : "rgba(251,255,252,0.9)",
                  borderRadius: 0,
                },
                "& fieldset": { border: "none" },
              }}
            />
            <Box sx={{ px: 2, py: 0.5, borderTop: "1px solid", borderColor: "divider" }}>
              <Typography sx={{ fontSize: "0.68rem", color: "text.secondary" }}>
                Ctrl+Enter で実行
              </Typography>
            </Box>
          </Paper>

          {/* Execution log */}
          <Paper
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              overflow: "hidden",
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                px: 2,
                py: 1.5,
                borderBottom: results.length > 0 ? "1px solid" : "none",
                borderColor: "divider",
              }}
            >
              <Typography sx={{ fontWeight: 700, flex: 1 }}>
                $ execution-log
              </Typography>
              <Chip label={results.length} size="small" />
              {results.length > 0 && (
                <>
                  <Tooltip title="Copy all results as text">
                    <Button
                      size="small"
                      variant={copied ? "contained" : "outlined"}
                      color={copied ? "success" : "primary"}
                      onClick={handleCopyResults}
                      sx={{ fontSize: "0.72rem", minWidth: 96 }}
                    >
                      {copied ? "Copied ✓" : "Copy results"}
                    </Button>
                  </Tooltip>
                  <Tooltip title="Clear log">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setResults([])}
                      sx={{ fontSize: "0.72rem", minWidth: 56 }}
                    >
                      Clear
                    </Button>
                  </Tooltip>
                </>
              )}
            </Stack>

            {results.length > 0 ? (
              <Box
                ref={logRef}
                sx={{
                  maxHeight: "calc(100vh - 420px)",
                  minHeight: 200,
                  overflow: "auto",
                  p: 2,
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? "rgba(0,6,2,0.94)"
                      : "rgba(251,255,252,0.9)",
                }}
              >
                {results.map((r, i) => (
                  <ResultCard key={i} result={r} />
                ))}
              </Box>
            ) : (
              <Box sx={{ minHeight: 120, p: 3 }}>
                <Typography color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                  ブラウザでAIからJSONをコピーして上のエリアに貼り付け、Executeで実行します
                </Typography>
              </Box>
            )}
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
