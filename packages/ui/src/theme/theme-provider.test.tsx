import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ThemeProvider, useTheme } from "./theme-provider";

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
    // Clear localStorage and DOM class between tests
    localStorage.clear();
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

  it("reads theme from localStorage on mount", () => {
    localStorage.setItem("emerald-theme", "dark");
    render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );
    expect(screen.getByTestId("current-theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("respects the defaultTheme prop over localStorage", () => {
    localStorage.setItem("emerald-theme", "light");
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

  it("setTheme persists to localStorage", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );

    await user.click(screen.getByTestId("set-dark"));
    expect(localStorage.getItem("emerald-theme")).toBe("dark");

    await user.click(screen.getByTestId("set-light"));
    expect(localStorage.getItem("emerald-theme")).toBe("light");
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

  it("persists theme choice across reloads (simulated)", () => {
    // Simulate: first render sets dark
    const { unmount } = render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );

    // Set to dark manually via localStorage to simulate toggle + unmount
    localStorage.setItem("emerald-theme", "dark");
    unmount();
    document.documentElement.classList.remove("light", "dark");

    // Second render: should pick up dark from storage
    render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );
    expect(screen.getByTestId("current-theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
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
