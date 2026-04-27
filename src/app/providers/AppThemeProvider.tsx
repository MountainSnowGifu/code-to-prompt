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
        main: isDark ? "#00ff6a" : "#006b3a",
      },
      success: {
        main: isDark ? "#72ff9f" : "#008f4d",
      },
      error: {
        main: isDark ? "#ff4d6d" : "#b4233b",
      },
      info: {
        main: isDark ? "#48f5ff" : "#006d9c",
      },
      background: {
        default: isDark ? "#000704" : "#e8f3ea",
        paper: isDark ? "rgba(1, 15, 8, 0.9)" : "rgba(248, 255, 250, 0.92)",
      },
      text: {
        primary: isDark ? "#d9ffe5" : "#092316",
        secondary: isDark ? "#6dbe86" : "#386149",
      },
      divider: isDark ? "rgba(0, 255, 106, 0.28)" : "rgba(0, 107, 58, 0.24)",
    },
    shape: {
      borderRadius: 4,
    },
    typography: {
      fontFamily:
        '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: isDark
              ? "linear-gradient(180deg, rgba(0,255,106,0.045), rgba(0,0,0,0))"
              : "linear-gradient(180deg, rgba(0,107,58,0.055), rgba(255,255,255,0))",
            boxShadow: isDark
              ? "0 0 0 1px rgba(0, 255, 106, 0.22), 0 0 28px rgba(0, 255, 106, 0.08), inset 0 0 18px rgba(0, 255, 106, 0.035)"
              : "0 0 0 1px rgba(0, 107, 58, 0.14), 0 12px 32px rgba(0, 46, 22, 0.07), inset 0 0 18px rgba(0, 107, 58, 0.04)",
            backdropFilter: "blur(10px)",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 800,
            borderRadius: 3,
            letterSpacing: 0,
            boxShadow: isDark
              ? "0 0 18px rgba(0, 255, 106, 0.16)"
              : "0 0 14px rgba(0, 107, 58, 0.08)",
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 3,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 3,
            backgroundColor: isDark ? "rgba(0, 10, 5, 0.9)" : "rgba(253, 255, 253, 0.86)",
            boxShadow: isDark
              ? "inset 0 0 16px rgba(0, 255, 106, 0.06)"
              : "inset 0 0 14px rgba(0, 107, 58, 0.045)",
          },
          notchedOutline: {
            borderColor: isDark ? "rgba(0, 255, 106, 0.32)" : "rgba(0, 107, 58, 0.24)",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 3,
            fontWeight: 800,
            backgroundColor: isDark ? "rgba(0, 255, 106, 0.08)" : "rgba(0, 107, 58, 0.075)",
            borderColor: isDark ? "rgba(0, 255, 106, 0.28)" : "rgba(0, 107, 58, 0.22)",
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
