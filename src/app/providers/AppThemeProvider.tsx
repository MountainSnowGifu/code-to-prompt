import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import type { ReactNode } from "react";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#39ff88",
    },
    success: {
      main: "#39ff88",
    },
    error: {
      main: "#ff5f7a",
    },
    info: {
      main: "#65d8ff",
    },
    background: {
      default: "#050607",
      paper: "#0b0f10",
    },
    text: {
      primary: "#d8ffe6",
      secondary: "#7f9b8d",
    },
    divider: "rgba(57, 255, 136, 0.22)",
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
          boxShadow: "0 0 0 1px rgba(57, 255, 136, 0.08)",
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
          backgroundColor: "#060909",
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

type AppThemeProviderProps = {
  children: ReactNode;
};

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
