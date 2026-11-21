import { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/firebase/fb";
import { type SiteSettings, type StoreLayoutType, DEFAULT_SETTINGS } from "@/types/siteSettings";
import { applyThemeColor, applyStoreLayout } from "@/lib/themeUtils";

interface SiteSettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  saveSettings: (updates: Partial<SiteSettings>) => Promise<void>;
  applyPreviewTheme: (colorHex: string) => void;
  applyPreviewLayout: (layout: StoreLayoutType) => void;
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  saveSettings: async () => {},
  applyPreviewTheme: () => {},
  applyPreviewLayout: () => {},
});

const SETTINGS_DOC = doc(db, "siteSettings", "config");

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener — any admin change reflects instantly for all users
    const unsubscribe = onSnapshot(SETTINGS_DOC, (snap) => {
      if (snap.exists()) {
        const merged = { ...DEFAULT_SETTINGS, ...snap.data() } as SiteSettings;
        setSettings(merged);
        applyStoreLayout(merged.storeLayout);
        if (merged.primaryColor) {
          applyThemeColor(merged.primaryColor);
        }
        if (merged.themeMode) {
          const root = document.documentElement;
          if (merged.themeMode === "light") {
            root.classList.remove("dark");
            root.classList.add("light");
          } else if (merged.themeMode === "dark") {
            root.classList.remove("light");
            root.classList.add("dark");
          } else if (merged.themeMode === "system") {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            root.classList.toggle("dark", prefersDark);
            root.classList.toggle("light", !prefersDark);
          }
        }
      } else {
        applyThemeColor(DEFAULT_SETTINGS.primaryColor);
        const root = document.documentElement;
        root.classList.remove("dark");
        root.classList.add("light");
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const saveSettings = async (updates: Partial<SiteSettings>) => {
    await setDoc(SETTINGS_DOC, { ...settings, ...updates }, { merge: true });
    if (updates.storeLayout) {
      applyStoreLayout(updates.storeLayout);
    }
    if (updates.primaryColor) {
      applyThemeColor(updates.primaryColor);
    }
    if (updates.themeMode) {
      localStorage.setItem("theme", updates.themeMode);
      const root = document.documentElement;
      if (updates.themeMode === "light") {
        root.classList.remove("dark");
        root.classList.add("light");
      } else if (updates.themeMode === "dark") {
        root.classList.remove("light");
        root.classList.add("dark");
      } else if (updates.themeMode === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", prefersDark);
        root.classList.toggle("light", !prefersDark);
      }
    }
  };

  const applyPreviewTheme = (colorHex: string) => {
    applyThemeColor(colorHex);
  };

  const applyPreviewLayout = (layout: StoreLayoutType) => {
    applyStoreLayout(layout);
  };

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, saveSettings, applyPreviewTheme, applyPreviewLayout }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
