import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { countSourceChars } from "../api/entryApi";
import { PromptTemplatesPanel } from "../../prompt/components/PromptTemplatesPanel";
import { useEntryNames } from "../hooks/useEntryNames";
import { pickFolder } from "../../../shared/lib/tauri";

type ContentMode = "tree" | "diff";
type LangMode = "all" | "rust" | "haskell" | "csharp" | "react" | "fsharp";

const LANG_LABELS: Record<LangMode, string> = {
  all: "ALL",
  rust: "RUST",
  haskell: "HASKELL",
  csharp: "C#",
  react: "REACT",
  fsharp: "F#",
};

const LANG_PATTERNS: Record<Exclude<LangMode, "all">, string[]> = {
  rust: [".rs", ".toml", ".lock"],
  haskell: [".hs", ".lhs", ".cabal"],
  csharp: [".cs", ".csproj", ".sln", ".xaml", ".razor", ".cshtml"],
  react: [".tsx", ".ts", ".jsx", ".js", ".css", ".scss", ".less", ".json", ".svg"],
  fsharp: [".fs", ".fsi", ".fsx", ".fsproj"],
};

function matchesLang(filePath: string, lang: LangMode): boolean {
  if (lang === "all") return true;
  const patterns = LANG_PATTERNS[lang];
  const lower = filePath.toLowerCase();
  return patterns.some((ext) => lower.endsWith(ext));
}

function filterEntries(entries: string[], lang: LangMode): string[] {
  if (lang === "all") return entries;

  const matchingFiles = new Set(
    entries.filter((e) => !e.endsWith("/") && matchesLang(e, lang)),
  );

  const dirsToKeep = new Set<string>();
  for (const filePath of matchingFiles) {
    const parts = filePath.split("/");
    for (let i = 1; i < parts.length; i++) {
      dirsToKeep.add(parts.slice(0, i).join("/") + "/");
    }
  }

  return entries.filter((e) => (e.endsWith("/") ? dirsToKeep.has(e) : matchingFiles.has(e)));
}

function parseTreePath(path: string) {
  const isDir = path.endsWith("/");
  const clean = path.replace(/\/$/, "");
  const parts = clean.split("/").filter(Boolean);
  const depth = parts.length - 1;
  const name = (parts[parts.length - 1] ?? "") + (isDir ? "/" : "");
  return { depth, name, isDir };
}

function FolderOpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
    </svg>
  );
}

function diffLineColor(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---")) return "text.secondary";
  if (line.startsWith("+")) return "success.main";
  if (line.startsWith("-")) return "error.main";
  if (line.startsWith("@@")) return "info.main";
  if (line.startsWith("diff ") || line.startsWith("index ")) return "text.secondary";
  return "text.primary";
}

export function EntryPage() {
  const [contentMode, setContentMode] = useState<ContentMode>("tree");
  const [langMode, setLangMode] = useState<LangMode>("all");
  const [isCopied, setIsCopied] = useState(false);

  const {
    path,
    setPath,
    scannedPath,
    entries,
    diffContent,
    savedFilePaths,
    skippedSourcePaths,
    isLoading,
    isDiffLoading,
    isExporting,
    errorMessage,
    scanEntries,
    fetchDiff,
    downloadEntries,
    downloadSource,
    downloadDiff,
    openSavedFileFolder,
    clearErrorMessage,
    showErrorMessage,
  } = useEntryNames();

  const filteredEntries = useMemo(
    () => filterEntries(entries, langMode),
    [entries, langMode],
  );
  const filteredFiles = useMemo(
    () => filteredEntries.filter((e) => !e.endsWith("/")),
    [filteredEntries],
  );

  const [charCount, setCharCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!scannedPath || filteredFiles.length === 0) {
      setCharCount(null);
      return () => {
        cancelled = true;
      };
    }
    countSourceChars(scannedPath, filteredFiles)
      .then((count) => {
        if (!cancelled) setCharCount(count);
      })
      .catch(() => {
        if (!cancelled) setCharCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [scannedPath, filteredFiles]);

  const diffLines = diffContent.split("\n");
  const estimatedTokens =
    charCount === null ? null : Math.max(1, Math.ceil(charCount / 4));
  const isAnyLoading = isLoading || isDiffLoading;
  const panelEmpty =
    contentMode === "tree" ? filteredEntries.length === 0 : diffContent === "";
  const isInitialEmpty = scannedPath === "";
  const isFilteredEmpty =
    contentMode === "tree" && entries.length > 0 && filteredEntries.length === 0;

  function handleTree() {
    setLangMode("all");
    setContentMode("tree");
    scanEntries();
  }

  function handleDiff() {
    setContentMode("diff");
    fetchDiff();
  }

  async function handlePickFolder() {
    const selected = await pickFolder();
    if (selected) setPath(selected);
  }

  async function handleCopyContent() {
    const text =
      contentMode === "tree" ? filteredEntries.join("\n") : diffContent;
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      showErrorMessage("Failed to copy content to clipboard.");
    }
  }

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        py: { xs: 3, sm: 4 },
        background:
          "radial-gradient(circle at 50% 0%, rgba(57, 255, 136, 0.08), transparent 360px), #050607",
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Box
            component="header"
            sx={{
              borderLeft: "2px solid",
              borderColor: "primary.main",
              pl: 2,
            }}
          >
            <Typography
              component="p"
              sx={{
                mb: 1,
                color: "primary.main",
                fontSize: "0.76rem",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              $ code-to-prompt
            </Typography>
            <Typography
              component="h1"
              variant="h4"
              sx={{ color: "text.primary", fontWeight: 800 }}
            >
              {contentMode === "tree" ? "Code to Prompt" : "Diff to Prompt"}
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) auto" },
              gap: 1.5,
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <TextField
                label="$ path"
                value={path}
                onChange={(e) => setPath(e.currentTarget.value)}
                placeholder="/path/to/your/project"
                size="small"
                fullWidth
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (contentMode === "diff") handleDiff();
                    else handleTree();
                  }
                }}
              />
              <Tooltip title="Choose folder">
                <IconButton
                  onClick={handlePickFolder}
                  size="small"
                  sx={{ color: "primary.main", border: "1px solid", borderColor: "divider" }}
                >
                  <FolderOpenIcon />
                </IconButton>
              </Tooltip>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant={contentMode === "tree" ? "contained" : "outlined"}
                disabled={isAnyLoading || path.trim() === ""}
                onClick={handleTree}
                sx={{ minWidth: 80 }}
              >
                {isLoading ? <CircularProgress color="inherit" size={20} /> : "Code"}
              </Button>
              <Button
                variant={contentMode === "diff" ? "contained" : "outlined"}
                disabled={isAnyLoading || path.trim() === ""}
                onClick={handleDiff}
                sx={{ minWidth: 80 }}
              >
                {isDiffLoading ? <CircularProgress color="inherit" size={20} /> : "Diff"}
              </Button>
            </Stack>
          </Paper>

          {contentMode === "tree" && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography
                sx={{ fontSize: "0.78rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}
              >
                Lang
              </Typography>
              <ToggleButtonGroup
                value={langMode}
                exclusive
                size="small"
                onChange={(_, val) => {
                  if (val !== null) setLangMode(val as LangMode);
                }}
              >
                {(Object.keys(LANG_LABELS) as LangMode[]).map((lang) => (
                  <ToggleButton key={lang} value={lang} sx={{ px: 1.5, fontSize: "0.75rem", fontWeight: 700 }}>
                    {LANG_LABELS[lang]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          )}

          {errorMessage !== "" && (
            <Alert severity="error" variant="outlined" onClose={clearErrorMessage}>
              {errorMessage}
            </Alert>
          )}

          {savedFilePaths.length > 0 && (
            <Alert
              severity="success"
              variant="outlined"
              action={
                <Button color="inherit" size="small" onClick={openSavedFileFolder}>
                  Open folder
                </Button>
              }
            >
              {savedFilePaths.length === 1 ? (
                <>Saved to {savedFilePaths[0]}</>
              ) : (
                <>
                  Saved {savedFilePaths.length} files
                  {savedFilePaths.map((p, i) => (
                    <Box key={p} sx={{ fontSize: "0.78rem", mt: 0.25 }}>
                      {i + 1}. {p}
                    </Box>
                  ))}
                </>
              )}
              {skippedSourcePaths.length > 0 && (
                <Box sx={{ mt: 1, fontSize: "0.78rem" }}>
                  Skipped {skippedSourcePaths.length} unreadable files
                  {skippedSourcePaths.slice(0, 5).map((p) => (
                    <Box key={p} sx={{ mt: 0.25 }}>
                      {p}
                    </Box>
                  ))}
                  {skippedSourcePaths.length > 5 && (
                    <Box sx={{ mt: 0.25 }}>
                      and {skippedSourcePaths.length - 5} more
                    </Box>
                  )}
                </Box>
              )}
            </Alert>
          )}

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
              sx={{
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                px: 2,
                py: 1.5,
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography sx={{ fontWeight: 700 }}>
                  {contentMode === "tree" ? "$ prompt-source" : "$ diff-source"}
                </Typography>
                {contentMode === "tree" && (
                  <>
                    <Chip label={filteredFiles.length} size="small" />
                    {charCount !== null && (
                      <>
                        <Chip
                          label={`${charCount.toLocaleString()} chars`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`~${estimatedTokens?.toLocaleString()} tokens`}
                          size="small"
                          variant="outlined"
                        />
                      </>
                    )}
                  </>
                )}
                {contentMode === "diff" && diffContent !== "" && (
                  <>
                    <Chip
                      label={`+${diffLines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).length}`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={`-${diffLines.filter((l) => l.startsWith("-") && !l.startsWith("---")).length}`}
                      size="small"
                      color="error"
                      variant="outlined"
                    />
                  </>
                )}
              </Stack>
              <Stack direction="row" spacing={1}>
                <Tooltip title="Copy content to clipboard">
                  <span>
                    <Button
                      variant={isCopied ? "contained" : "outlined"}
                      color={isCopied ? "success" : "primary"}
                      size="small"
                      disabled={panelEmpty}
                      onClick={handleCopyContent}
                      sx={{ minWidth: 80 }}
                    >
                      {isCopied ? "Copied ✓" : "Copy"}
                    </Button>
                  </span>
                </Tooltip>
                {contentMode === "tree" && (
                  <Tooltip title="Export source code for each file">
                    <span>
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={scannedPath === "" || isExporting || panelEmpty}
                        onClick={() => downloadSource(filteredFiles)}
                      >
                        {isExporting ? <CircularProgress size={18} /> : "Export source"}
                      </Button>
                    </span>
                  </Tooltip>
                )}
                <Tooltip
                  title={
                    contentMode === "tree"
                      ? "Export prompt-ready code paths as text"
                      : "Export Git diff as text"
                  }
                >
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={scannedPath === "" || isExporting || panelEmpty}
                      onClick={
                        contentMode === "tree"
                          ? () => downloadEntries(filteredEntries)
                          : downloadDiff
                      }
                    >
                      {isExporting ? (
                        <CircularProgress size={18} />
                      ) : contentMode === "tree" ? (
                        "Export tree"
                      ) : (
                        "Export diff"
                      )}
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>
            <Divider />

            {!panelEmpty ? (
              <Box
                aria-live="polite"
                sx={{
                  maxHeight: "calc(100vh - 290px)",
                  minHeight: 280,
                  overflow: "auto",
                  py: 1,
                  bgcolor: "#030505",
                  fontFamily: "inherit",
                  fontSize: "0.82rem",
                }}
              >
                {contentMode === "tree"
                  ? filteredEntries.map((entry) => {
                      const { depth, name, isDir } = parseTreePath(entry);
                      return (
                        <Box
                          key={entry}
                          sx={{
                            pl: `${depth * 20 + 12}px`,
                            pr: 1.5,
                            py: "2px",
                            color: isDir ? "primary.main" : "text.primary",
                            fontWeight: isDir ? 600 : 400,
                            "&:hover": { bgcolor: "rgba(57, 255, 136, 0.08)" },
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {isDir ? "./" : "> "}
                          {name}
                        </Box>
                      );
                    })
                  : diffLines.map((line, i) => (
                      <Box
                        key={i}
                        sx={{
                          px: 1.5,
                          py: "1px",
                          color: diffLineColor(line),
                          bgcolor:
                            line.startsWith("+") && !line.startsWith("+++")
                              ? "rgba(46,160,67,0.08)"
                              : line.startsWith("-") && !line.startsWith("---")
                                ? "rgba(255,95,122,0.08)"
                                : "transparent",
                          whiteSpace: "pre",
                        }}
                      >
                        {line}
                      </Box>
                    ))}
              </Box>
            ) : (
              <Box sx={{ minHeight: 280, p: 3 }} aria-live="polite">
                <Typography color="text.secondary">
                  {isFilteredEmpty
                    ? `No files match ${LANG_LABELS[langMode]}`
                    : isInitialEmpty
                      ? "Choose a code folder, then fetch prompt material"
                      : contentMode === "tree"
                        ? "No prompt-ready code found"
                        : "No diff found"}
                </Typography>
              </Box>
            )}
          </Paper>
          <PromptTemplatesPanel />
        </Stack>
      </Container>
    </Box>
  );
}
