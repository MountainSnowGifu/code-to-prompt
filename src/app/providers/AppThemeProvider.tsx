import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ThemeMode = "dark" | "light";

const STORAGE_KEY = "code-to-prompt:theme-mode";

function loadThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function saveThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {}
}

function buildTheme(mode: ThemeMode) {
  const isDark = mode === "dark";

  return createTheme({
  palette: {
    mode,
    primary: {
      main: isDark ? "#39ff88" : "#007a45",
    },
    success: {
      main: isDark ? "#39ff88" : "#007a45",
    },
    error: {
      main: isDark ? "#ff5f7a" : "#b4233b",
    },
    info: {
      main: isDark ? "#65d8ff" : "#006d9c",
    },
    background: {
      default: isDark ? "#050607" : "#f4f7f5",
      paper: isDark ? "#0b0f10" : "#ffffff",
    },
    text: {
      primary: isDark ? "#d8ffe6" : "#10241a",
      secondary: isDark ? "#7f9b8d" : "#527061",
    },
    divider: isDark ? "rgba(57, 255, 136, 0.22)" : "rgba(0, 122, 69, 0.2)",
  },
  shape: {
    borderRadius: 6,
  },
  typography: {
    fontFamily:
      '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: isDark
            ? "0 0 0 1px rgba(57, 255, 136, 0.08)"
            : "0 0 0 1px rgba(0, 122, 69, 0.08)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 700,
          borderRadius: 4,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: isDark ? "#060909" : "#fbfdfb",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontWeight: 700,
        },
      },
    },
  },
  });
}

type ThemeModeContextValue = {
  mode: ThemeMode;
  toggleMode: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

type AppThemeProviderProps = {
  children: ReactNode;
};

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(loadThemeMode);
  const theme = useMemo(() => buildTheme(mode), [mode]);
  const value = useMemo(
    () => ({
      mode,
      toggleMode: () => {
        setMode((current) => {
          const next = current === "dark" ? "light" : "dark";
          saveThemeMode(next);
          return next;
        });
      },
    }),
    [mode],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const value = useContext(ThemeModeContext);
  if (!value) {
    throw new Error("useThemeMode must be used within AppThemeProvider");
  }
  return value;
}
