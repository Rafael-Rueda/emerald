"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "emerald-theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage may be unavailable (SSR, iframe restrictions, etc.)
  }
  return "light";
}

function persistTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Silently ignore storage errors
  }
}

function applyThemeClass(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Override the default initial theme (defaults to stored preference or "light"). */
  defaultTheme?: Theme;
}

/**
 * Provides persisted light/dark theme management.
 *
 * - Reads the initial theme from localStorage (key: "emerald-theme").
 * - Applies the theme as a CSS class on `<html>` (for Tailwind `darkMode: "class"`).
 * - Persists changes to localStorage so theme survives reloads and works across apps.
 */
export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => defaultTheme ?? getStoredTheme());

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    persistTheme(next);
    applyThemeClass(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  // Apply theme class on mount and when theme changes
  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  // Sync with localStorage on mount (in case defaultTheme wasn't provided).
  // Intentionally runs only on mount — theme and defaultTheme are captured
  // at initialization time and should not trigger re-sync.
  useEffect(() => {
    if (!defaultTheme) {
      const stored = getStoredTheme();
      if (stored !== theme) {
        setThemeState(stored);
      }
    }
  }, []); // mount-only

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Access the current theme and theme-switching functions.
 * Must be used inside a `<ThemeProvider>`.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
