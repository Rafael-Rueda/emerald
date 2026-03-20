import React from "react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProviders } from "@emerald/ui/providers";
import { WorkspaceAdminShell } from "./workspace-admin-shell";

let mockPathname = "/admin/documents";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function renderAdminShell() {
  return render(
    <AppProviders defaultTheme="light">
      <WorkspaceAdminShell>
        <div data-testid="admin-content">Admin section content</div>
      </WorkspaceAdminShell>
    </AppProviders>,
  );
}

describe("WorkspaceAdminShell", () => {
  beforeEach(() => {
    mockPathname = "/admin/documents";
  });

  it("renders all primary admin navigation routes", () => {
    renderAdminShell();

    expect(screen.getByRole("link", { name: "Documents" })).toHaveAttribute(
      "href",
      "/admin/documents",
    );
    expect(screen.getByRole("link", { name: "Navigation" })).toHaveAttribute(
      "href",
      "/admin/navigation",
    );
    expect(screen.getByRole("link", { name: "Versions" })).toHaveAttribute(
      "href",
      "/admin/versions",
    );
    expect(screen.getByRole("link", { name: "AI Context" })).toHaveAttribute(
      "href",
      "/admin/ai-context",
    );
  });

  it("maps /admin to the canonical documents section heading and active nav", () => {
    mockPathname = "/admin";
    renderAdminShell();

    expect(screen.getByText("Workspace Admin · Documents")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Documents" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("updates active location state based on current route", () => {
    mockPathname = "/admin/ai-context";
    renderAdminShell();

    expect(screen.getByText("Workspace Admin · AI Context")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "AI Context" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Documents" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("keeps shell state mounted while section route changes", async () => {
    const user = userEvent.setup();
    const view = renderAdminShell();

    await user.click(screen.getByRole("button", { name: /open navigation/i }));
    expect(
      screen.getByRole("button", { name: /close navigation/i }),
    ).toBeInTheDocument();

    mockPathname = "/admin/navigation";
    view.rerender(
      <AppProviders defaultTheme="light">
        <WorkspaceAdminShell>
          <div data-testid="admin-content">Admin section content</div>
        </WorkspaceAdminShell>
      </AppProviders>,
    );

    expect(screen.getByText("Workspace Admin · Navigation")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /close navigation/i }),
    ).toBeInTheDocument();
  });
});
