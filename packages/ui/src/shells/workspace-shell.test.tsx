import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { WorkspaceShell } from "./workspace-shell";
import { ThemeProvider } from "../theme/theme-provider";

function renderShell(
  props: Partial<React.ComponentProps<typeof WorkspaceShell>> = {}
) {
  return render(
    <ThemeProvider defaultTheme="light">
      <WorkspaceShell {...props}>
        <div data-testid="content">Main content</div>
      </WorkspaceShell>
    </ThemeProvider>
  );
}

describe("WorkspaceShell", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("renders the header with default title", () => {
    renderShell();
    expect(screen.getByText("Emerald Workspace")).toBeInTheDocument();
  });

  it("renders the header with a custom title", () => {
    renderShell({ title: "Custom Admin" });
    expect(screen.getByText("Custom Admin")).toBeInTheDocument();
  });

  it("renders the main content", () => {
    renderShell();
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("renders placeholder navigation when no nav prop is given", () => {
    renderShell();
    expect(screen.getByText("Navigation placeholder")).toBeInTheDocument();
  });

  it("renders custom navigation content", () => {
    renderShell({
      navigation: <div data-testid="custom-nav">Custom nav</div>,
    });
    expect(screen.getByTestId("custom-nav")).toBeInTheDocument();
  });

  it("has an accessible hamburger button", () => {
    renderShell();
    const button = screen.getByRole("button", { name: /open navigation/i });
    expect(button).toBeInTheDocument();
  });

  it("toggles navigation open/closed on hamburger click", async () => {
    const user = userEvent.setup();
    renderShell();

    const button = screen.getByRole("button", { name: /open navigation/i });
    await user.click(button);

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

  it("has admin navigation landmark", () => {
    renderShell();
    expect(
      screen.getByRole("navigation", { name: /admin/i })
    ).toBeInTheDocument();
  });
});
