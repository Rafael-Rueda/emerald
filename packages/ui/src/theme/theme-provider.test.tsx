import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ThemeProvider, useTheme, THEME_COOKIE_NAME, themeInitScript } from "./theme-provider";

// Helper to read a cookie value from document.cookie
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

// Helper to set a cookie
function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${value};path=/`;
}

// Helper to clear a cookie
function clearCookie(name: string): void {
  document.cookie = `${name}=;path=/;max-age=0`;
}

// Helper component to inspect and control the theme context
function ThemeInspector() {
  const { theme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button data-testid="toggle" onClick={toggleTheme}>
        toggle
      </button>
      <button data-testid="set-light" onClick={() => setTheme("light")}>
        light
      </button>
      <button data-testid="set-dark" onClick={() => setTheme("dark")}>
        dark
      </button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    // Clear cookie and DOM class between tests
    clearCookie(THEME_COOKIE_NAME);
    document.documentElement.classList.remove("light", "dark");
  });

  it("defaults to light theme when no stored preference exists", () => {
    render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );
    expect(screen.getByTestId("current-theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("reads theme from cookie on mount", () => {
    setCookie(THEME_COOKIE_NAME, "dark");
    render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );
    expect(screen.getByTestId("current-theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("respects the defaultTheme prop over cookie", () => {
    setCookie(THEME_COOKIE_NAME, "light");
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeInspector />
      </ThemeProvider>
    );
    expect(screen.getByTestId("current-theme").textContent).toBe("dark");
  });

  it("toggleTheme switches between light and dark", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current-theme").textContent).toBe("light");

    await user.click(screen.getByTestId("toggle"));
    expect(screen.getByTestId("current-theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await user.click(screen.getByTestId("toggle"));
    expect(screen.getByTestId("current-theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("setTheme persists to cookie", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );

    await user.click(screen.getByTestId("set-dark"));
    expect(getCookie(THEME_COOKIE_NAME)).toBe("dark");

    await user.click(screen.getByTestId("set-light"));
    expect(getCookie(THEME_COOKIE_NAME)).toBe("light");
  });

  it("applies the correct class on <html> element", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );

    // Initially light
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    await user.click(screen.getByTestId("set-dark"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("persists theme choice across reloads (simulated via cookie)", () => {
    // Simulate: first render sets dark
    const { unmount } = render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );

    // Set cookie to dark to simulate toggle + unmount
    setCookie(THEME_COOKIE_NAME, "dark");
    unmount();
    document.documentElement.classList.remove("light", "dark");

    // Second render: should pick up dark from cookie
    render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );
    expect(screen.getByTestId("current-theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("cookie is shared across origins on the same host (simulated)", async () => {
    // This test simulates the cross-origin behavior:
    // Setting a theme via the provider writes to document.cookie,
    // which (in a real browser on localhost) is shared across ports.
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );

    await user.click(screen.getByTestId("set-dark"));
    const cookieValue = getCookie(THEME_COOKIE_NAME);
    expect(cookieValue).toBe("dark");

    // Simulate "another origin" reading the same cookie (in jsdom,
    // document.cookie is the same object, which mirrors real localhost behavior)
    const { unmount } = render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );
    expect(screen.getAllByTestId("current-theme")[1].textContent).toBe("dark");
    unmount();
  });
});

describe("useTheme", () => {
  it("throws if used outside ThemeProvider", () => {
    // Suppress console.error during expected error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<ThemeInspector />);
    }).toThrow("useTheme must be used within a ThemeProvider");

    spy.mockRestore();
  });
});

describe("themeInitScript", () => {
  beforeEach(() => {
    clearCookie(THEME_COOKIE_NAME);
    document.documentElement.classList.remove("light", "dark");
  });

  it("is a non-empty string", () => {
    expect(typeof themeInitScript).toBe("string");
    expect(themeInitScript.length).toBeGreaterThan(0);
  });

  it("applies dark class when cookie is set to dark", () => {
    setCookie(THEME_COOKIE_NAME, "dark");
    const fn = new Function(themeInitScript);
    fn();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("applies light class when cookie is set to light", () => {
    setCookie(THEME_COOKIE_NAME, "light");
    const fn = new Function(themeInitScript);
    fn();
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("defaults to light class when no cookie is set", () => {
    const fn = new Function(themeInitScript);
    fn();
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });
});
