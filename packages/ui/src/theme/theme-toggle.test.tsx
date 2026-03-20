import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ThemeProvider, useTheme } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

// Helper to read the current theme
function ThemeDisplay() {
  const { theme } = useTheme();
  return <span data-testid="theme">{theme}</span>;
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("renders with accessible label for light mode", () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole("button", {
      name: /switch to dark mode/i,
    });
    expect(button).toBeInTheDocument();
  });

  it("renders with accessible label for dark mode", () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole("button", {
      name: /switch to light mode/i,
    });
    expect(button).toBeInTheDocument();
  });

  it("toggles theme on click", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
        <ThemeDisplay />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("light");

    await user.click(
      screen.getByRole("button", { name: /switch to dark mode/i })
    );

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(
      screen.getByRole("button", { name: /switch to light mode/i })
    ).toBeInTheDocument();
  });
});
