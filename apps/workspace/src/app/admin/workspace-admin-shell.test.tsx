import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { AppProviders } from "@emerald/ui/providers";
import { WorkspaceContextProvider } from "../../modules/shared/application/workspace-context";
import { WorkspaceAdminShell } from "./workspace-admin-shell";

let mockPathname = "/admin/documents";
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
  }),
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

const server = setupServer(
  http.get("*/api/workspace/spaces", () =>
    HttpResponse.json([
      {
        id: "space-guides",
        key: "guides",
        name: "Guides",
        description: "Workspace guides",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]),
  ),
  http.get("*/api/workspace/versions", () =>
    HttpResponse.json({
      versions: [
        {
          id: "ver-v1",
          spaceId: "space-guides",
          key: "v1",
          label: "Version 1",
          status: "published",
          isDefault: true,
          publishedAt: "2026-01-01T00:00:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    }),
  ),
);

function renderAdminShell() {
  return render(
    <AppProviders defaultTheme="light">
      <WorkspaceContextProvider>
        <WorkspaceAdminShell>
          <div data-testid="admin-content">Admin section content</div>
        </WorkspaceAdminShell>
      </WorkspaceContextProvider>
    </AppProviders>,
  );
}

describe("WorkspaceAdminShell", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    mockPathname = "/admin/documents";
    mockPush.mockReset();
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
        <WorkspaceContextProvider>
          <WorkspaceAdminShell>
            <div data-testid="admin-content">Admin section content</div>
          </WorkspaceAdminShell>
        </WorkspaceContextProvider>
      </AppProviders>,
    );

    expect(screen.getByText("Workspace Admin · Navigation")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /close navigation/i }),
    ).toBeInTheDocument();
  });
});
