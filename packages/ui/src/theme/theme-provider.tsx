"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/** Cookie name shared across all localhost origins. */
export const THEME_COOKIE_NAME = "emerald-theme";

/**
 * Read the theme from the `emerald-theme` cookie.
 * Cookies are shared across ports on the same host, so this works
 * across localhost:3100 (docs) and localhost:3101 (workspace).
 */
function getStoredTheme(): Theme {
  if (typeof document === "undefined") return "light";
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${THEME_COOKIE_NAME}=([^;]*)`)
    );
    const value = match?.[1];
    if (value === "light" || value === "dark") return value;
  } catch {
    // Cookie access may fail in some restricted contexts
  }
  return "light";
}

/**
 * Persist the theme as a cookie that is accessible across all localhost ports.
 * Uses `path=/` and `SameSite=Lax`; no domain attribute is set so the cookie
 * naturally scopes to the current host (localhost) and is shared across ports.
 * Max-age is set to 1 year.
 */
function persistTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  try {
    const maxAge = 365 * 24 * 60 * 60; // 1 year in seconds
    document.cookie = `${THEME_COOKIE_NAME}=${theme};path=/;max-age=${maxAge};SameSite=Lax`;
  } catch {
    // Silently ignore cookie errors
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
 * - Reads the initial theme from a host-scoped cookie (key: "emerald-theme").
 * - Applies the theme as a CSS class on `<html>` (for Tailwind `darkMode: "class"`).
 * - Persists changes to a cookie so theme survives reloads and works across
 *   all apps on the same host (e.g. localhost:3100 and localhost:3101).
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

  // Sync with cookie on mount (in case defaultTheme wasn't provided).
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

/**
 * Inline script source that reads the theme cookie and applies the class
 * on `<html>` before React hydrates, avoiding flash of wrong theme.
 * Intended to be rendered as `<script dangerouslySetInnerHTML>` in the
 * root layout `<head>`.
 */
export const themeInitScript = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)emerald-theme=([^;]*)/);var t=m&&m[1];if(t==='dark'||t==='light'){document.documentElement.classList.add(t)}else{document.documentElement.classList.add('light')}}catch(e){document.documentElement.classList.add('light')}})();`;
