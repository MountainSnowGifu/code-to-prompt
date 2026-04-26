import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  CssBaseline,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";
import "./App.css";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1f6f78",
    },
    background: {
      default: "#f4f7f8",
      paper: "#ffffff",
    },
    text: {
      primary: "#17212b",
      secondary: "#587078",
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
});

function App() {
  const [path, setPath] = useState("");
  const [entries, setEntries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function loadEntries() {
    setIsLoading(true);

    try {
      const entryNames = await invoke<string[]>("get_entry_names_command", {
        path,
      });
      setEntries(entryNames);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
                Folder Entries
              </Typography>
            </Box>

            <Paper
              component="form"
              elevation={0}
              onSubmit={(e) => {
                e.preventDefault();
                loadEntries();
              }}
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
              />
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading || path.trim() === ""}
                sx={{ minWidth: 104 }}
              >
                {isLoading ? <CircularProgress color="inherit" size={20} /> : "Scan"}
              </Button>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
              }}
            >
              <Stack
                direction="row"
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 2,
                  py: 1.5,
                }}
              >
                <Typography sx={{ fontWeight: 700 }}>Entries</Typography>
                <Chip label={entries.length} size="small" />
              </Stack>
              <Divider />

              {entries.length > 0 ? (
                <List
                  dense
                  aria-live="polite"
                  sx={{
                    maxHeight: "calc(100vh - 290px)",
                    minHeight: 280,
                    overflow: "auto",
                    py: 0,
                  }}
                >
                  {entries.map((entry) => (
                    <ListItem key={entry} divider>
                      <ListItemText
                        primary={entry}
                        slotProps={{
                          primary: {
                            sx: { overflowWrap: "anywhere" },
                          },
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ minHeight: 280, p: 3 }} aria-live="polite">
                  <Typography color="text.secondary">No entries loaded.</Typography>
                </Box>
              )}
            </Paper>
          </Stack>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
