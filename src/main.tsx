import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { Toaster } from "./components/ui/toast.tsx"
import { AuthProvider } from "@/context/AuthContext.tsx"
import { SiteSettingsProvider } from "@/context/SiteSettingsContext.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <SiteSettingsProvider>
          <App />
          <Toaster />
        </SiteSettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
)