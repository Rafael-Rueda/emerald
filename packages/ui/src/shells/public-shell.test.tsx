import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { PublicShell } from "./public-shell";
import { ThemeProvider } from "../theme/theme-provider";

function renderShell(props: Partial<React.ComponentProps<typeof PublicShell>> = {}) {
  return render(
    <ThemeProvider defaultTheme="light">
      <PublicShell {...props}>
        <div data-testid="content">Main content</div>
      </PublicShell>
    </ThemeProvider>
  );
}

describe("PublicShell", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("renders the header with default title", () => {
    renderShell();
    expect(screen.getByText("Emerald Docs")).toBeInTheDocument();
  });

  it("renders the header with a custom title", () => {
    renderShell({ title: "Custom Title" });
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
  });

  it("renders the main content", () => {
    renderShell();
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("renders the sidebar placeholder when no sidebar prop is given", () => {
    renderShell();
    expect(screen.getByText("Navigation placeholder")).toBeInTheDocument();
  });

  it("renders custom sidebar content", () => {
    renderShell({
      sidebar: <div data-testid="custom-sidebar">Custom sidebar</div>,
    });
    expect(screen.getByTestId("custom-sidebar")).toBeInTheDocument();
  });

  it("has an accessible hamburger button", () => {
    renderShell();
    const button = screen.getByRole("button", { name: /open navigation/i });
    expect(button).toBeInTheDocument();
  });

  it("toggles sidebar open/closed on hamburger click", async () => {
    const user = userEvent.setup();
    renderShell();

    const button = screen.getByRole("button", { name: /open navigation/i });
    await user.click(button);

    // After opening, button label should indicate "close"
    expect(
      screen.getByRole("button", { name: /close navigation/i })
    ).toBeInTheDocument();
  });

  it("includes a theme toggle in the header", () => {
    renderShell();
    expect(
      screen.getByRole("button", { name: /switch to dark mode/i })
    ).toBeInTheDocument();
  });

  it("has sidebar navigation landmark", () => {
    renderShell();
    expect(screen.getByRole("navigation", { name: /sidebar/i })).toBeInTheDocument();
  });
});
