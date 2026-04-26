import { AppThemeProvider } from "./app/providers/AppThemeProvider";
import { AppRoutes } from "./app/routes/AppRoutes";
import "./App.css";

function App() {
  return (
    <AppThemeProvider>
      <AppRoutes />
    </AppThemeProvider>
  );
}

export default App;
