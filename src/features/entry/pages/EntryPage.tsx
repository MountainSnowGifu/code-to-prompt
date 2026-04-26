import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useEntryNames } from "../hooks/useEntryNames";

type Mode = "tree" | "diff";

function parseTreePath(path: string) {
  const isDir = path.endsWith("/");
  const clean = path.replace(/\/$/, "");
  const parts = clean.split("/").filter(Boolean);
  const depth = parts.length - 1;
  const name = (parts[parts.length - 1] ?? "") + (isDir ? "/" : "");
  return { depth, name, isDir };
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
  const [mode, setMode] = useState<Mode>("tree");

  const {
    path,
    setPath,
    scannedPath,
    entries,
    diffContent,
    savedFilePath,
    isLoading,
    isDiffLoading,
    isExporting,
    errorMessage,
    scanEntries,
    fetchDiff,
    downloadEntries,
    downloadDiff,
    openSavedFileFolder,
    clearErrorMessage,
  } = useEntryNames();

  function handleTree() {
    setMode("tree");
    scanEntries();
  }

  function handleDiff() {
    setMode("diff");
    fetchDiff();
  }

  const isAnyLoading = isLoading || isDiffLoading;
  const diffLines = diffContent.split("\n");
  const panelEmpty = mode === "tree" ? entries.length === 0 : diffContent === "";

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        py: { xs: 3, sm: 4 },
        background:
          "linear-gradient(180deg, rgba(83, 132, 145, 0.1), transparent 280px), #f4f7f8",
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Box component="header">
            <Typography
              component="p"
              sx={{
                mb: 1,
                color: "text.secondary",
                fontSize: "0.78rem",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Code to Prompt
            </Typography>
            <Typography component="h1" variant="h3" sx={{ fontWeight: 800 }}>
              {mode === "tree" ? "File Tree" : "Git Diff"}
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
            }}
          >
            <TextField
              label="Folder path"
              value={path}
              onChange={(e) => setPath(e.currentTarget.value)}
              placeholder="/home/akira/デスクトップ/Rust/Tauri"
              size="small"
              fullWidth
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTree();
              }}
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant={mode === "tree" ? "contained" : "outlined"}
                disabled={isAnyLoading || path.trim() === ""}
                onClick={handleTree}
                sx={{ minWidth: 80 }}
              >
                {isLoading ? <CircularProgress color="inherit" size={20} /> : "Tree"}
              </Button>
              <Button
                variant={mode === "diff" ? "contained" : "outlined"}
                disabled={isAnyLoading || path.trim() === ""}
                onClick={handleDiff}
                sx={{ minWidth: 80 }}
              >
                {isDiffLoading ? <CircularProgress color="inherit" size={20} /> : "Diff"}
              </Button>
            </Stack>
          </Paper>

          {savedFilePath !== "" && (
            <Alert
              severity="success"
              variant="outlined"
              action={
                <Button color="inherit" size="small" onClick={openSavedFileFolder}>
                  Open Folder
                </Button>
              }
            >
              Saved to {savedFilePath}
            </Alert>
          )}

          <Paper
            elevation={0}
            sx={{ border: "1px solid", borderColor: "divider", overflow: "hidden" }}
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
                  {mode === "tree" ? "File Tree" : "Git Diff"}
                </Typography>
                {mode === "tree" && <Chip label={entries.length} size="small" />}
                {mode === "diff" && diffContent !== "" && (
                  <Chip
                    label={`${diffLines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).length} additions`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
                {mode === "diff" && diffContent !== "" && (
                  <Chip
                    label={`${diffLines.filter((l) => l.startsWith("-") && !l.startsWith("---")).length} deletions`}
                    size="small"
                    color="error"
                    variant="outlined"
                  />
                )}
              </Stack>
              <Button
                variant="outlined"
                size="small"
                disabled={scannedPath === "" || isExporting || panelEmpty}
                onClick={mode === "tree" ? downloadEntries : downloadDiff}
              >
                {isExporting ? (
                  <CircularProgress size={18} />
                ) : mode === "tree" ? (
                  "Download Tree"
                ) : (
                  "Download Diff"
                )}
              </Button>
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
                  fontFamily: "monospace",
                  fontSize: "0.82rem",
                }}
              >
                {mode === "tree"
                  ? entries.map((entry) => {
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
                            "&:hover": { bgcolor: "action.hover" },
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {isDir ? "📁 " : "📄 "}
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
                                ? "rgba(248,81,73,0.08)"
                                : "transparent",
                          whiteSpace: "pre",
                          overflowX: "visible",
                        }}
                      >
                        {line}
                      </Box>
                    ))}
              </Box>
            ) : (
              <Box sx={{ minHeight: 280, p: 3 }} aria-live="polite">
                <Typography color="text.secondary">
                  {mode === "tree" ? "No entries loaded." : "No diff found."}
                </Typography>
              </Box>
            )}
          </Paper>
        </Stack>
      </Container>
      <Snackbar
        open={errorMessage !== ""}
        autoHideDuration={5000}
        onClose={clearErrorMessage}
      >
        <Alert severity="error" variant="filled" onClose={clearErrorMessage}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
