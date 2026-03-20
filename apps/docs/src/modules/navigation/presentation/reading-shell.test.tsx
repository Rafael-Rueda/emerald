import React from "react";
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, createTestServer } from "@emerald/test-utils";
import { ReadingShell } from "./reading-shell";

// Mock IntersectionObserver for jsdom
beforeEach(() => {
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  }));
});

// Track sidebar content set via context
const mockSetSidebar = vi.fn();
vi.mock("./sidebar-context", () => ({
  useSetSidebar: () => mockSetSidebar,
  useSidebarSlot: () => null,
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock next/link as a simple anchor tag for testing
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

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/guides/v1/getting-started",
  useSearchParams: () => new URLSearchParams(),
}));

function renderReadingShell(
  props: Partial<React.ComponentProps<typeof ReadingShell>> = {},
) {
  const defaultProps = {
    space: "guides",
    version: "v1",
    slug: "getting-started",
    versionSelector: undefined,
    headings: [],
    isDocumentLoading: false,
    children: <div data-testid="article-content">Document content</div>,
  };

  return renderWithProviders(
    <ReadingShell {...defaultProps} {...props} />,
  );
}

describe("ReadingShell — success navigation", () => {
  const server = createTestServer({
    navigation: "success",
    document: "success",
  });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("renders the reading shell container", () => {
    renderReadingShell();
    expect(screen.getByTestId("reading-shell")).toBeInTheDocument();
  });

  it("renders the article region with children", async () => {
    renderReadingShell();

    await waitFor(() => {
      expect(screen.getByTestId("article-content")).toBeInTheDocument();
    });

    expect(screen.getByTestId("reading-shell-article")).toBeInTheDocument();
  });

  it("renders breadcrumbs after navigation loads", async () => {
    renderReadingShell();

    await waitFor(() => {
      expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument();
    });

    expect(screen.getByTestId("breadcrumb-space")).toHaveTextContent("guides");
    expect(screen.getByTestId("breadcrumb-version")).toHaveTextContent("v1");
    expect(screen.getByTestId("breadcrumb-current")).toHaveTextContent(
      "Getting Started",
    );
  });

  it("renders TOC region", () => {
    renderReadingShell();
    expect(screen.getByTestId("reading-shell-toc")).toBeInTheDocument();
  });

  it("renders the versioning region when version selector content is provided", () => {
    renderReadingShell({
      versionSelector: <div data-testid="version-selector-mock">Version selector</div>,
    });

    expect(screen.getByTestId("reading-shell-versioning")).toBeInTheDocument();
    expect(screen.getByTestId("version-selector-mock")).toBeInTheDocument();
  });

  it("renders empty TOC for heading-less documents", () => {
    renderReadingShell({ headings: [] });
    expect(screen.getByTestId("toc-empty")).toBeInTheDocument();
    expect(screen.getByTestId("toc-no-sections")).toBeInTheDocument();
  });

  it("renders populated TOC for headed documents", () => {
    const headings = [
      { id: "installation", text: "Installation", level: 2 },
      { id: "configuration", text: "Configuration", level: 2 },
    ];

    // Add heading elements to the DOM for IntersectionObserver
    headings.forEach((h) => {
      const existing = document.getElementById(h.id);
      if (existing) existing.remove();
      const el = document.createElement("h2");
      el.id = h.id;
      el.textContent = h.text;
      document.body.appendChild(el);
    });

    renderReadingShell({ headings });
    expect(screen.getByTestId("toc")).toBeInTheDocument();
    expect(screen.getByTestId("toc-entry-installation")).toBeInTheDocument();
    expect(screen.getByTestId("toc-entry-configuration")).toBeInTheDocument();
  });

  it("shows transition state on version changes while document loading", async () => {
    const { rerender } = renderReadingShell({
      version: "v1",
      slug: "getting-started",
      isDocumentLoading: false,
      children: <div data-testid="article-content">V1 content</div>,
    });

    await waitFor(() => {
      expect(screen.getByTestId("article-content")).toBeInTheDocument();
    });

    rerender(
      <ReadingShell
        space="guides"
        version="v2"
        slug="getting-started"
        headings={[]}
        isDocumentLoading
      >
        <div data-testid="article-content">V2 content</div>
      </ReadingShell>,
    );

    expect(screen.getByTestId("article-transition")).toBeInTheDocument();
    expect(screen.queryByTestId("article-content")).not.toBeInTheDocument();
  });
});

describe("ReadingShell — sidebar context integration", () => {
  const server = createTestServer({
    navigation: "success",
    document: "success",
  });

  beforeAll(() => server.start());
  afterEach(() => {
    server.resetHandlers();
    mockSetSidebar.mockClear();
  });
  afterAll(() => server.stop());

  it("pushes sidebar content to context after navigation loads", async () => {
    renderReadingShell();

    // Wait for navigation to resolve and sidebar to be injected
    await waitFor(() => {
      // The setSidebar mock should have been called with JSX containing sidebar-nav
      expect(mockSetSidebar).toHaveBeenCalled();
      const lastCall = mockSetSidebar.mock.calls[mockSetSidebar.mock.calls.length - 1];
      expect(lastCall[0]).not.toBeNull();
    });
  });

  it("cleans up sidebar content on unmount", async () => {
    const { unmount } = renderReadingShell();

    await waitFor(() => {
      expect(mockSetSidebar).toHaveBeenCalled();
    });

    unmount();

    // Last call should be null (cleanup)
    const lastCall = mockSetSidebar.mock.calls[mockSetSidebar.mock.calls.length - 1];
    expect(lastCall[0]).toBeNull();
  });
});

describe("ReadingShell — error navigation", () => {
  const server = createTestServer({
    navigation: "error",
    document: "success",
  });

  beforeAll(() => server.start());
  afterEach(() => {
    server.resetHandlers();
    mockSetSidebar.mockClear();
  });
  afterAll(() => server.stop());

  it("renders a stable non-success state and does not render article content", async () => {
    renderReadingShell();

    // Wait for the error to resolve and sidebar to receive error content
    await waitFor(() => {
      expect(screen.getByTestId("navigation-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("article-content")).not.toBeInTheDocument();
  });
});

describe("ReadingShell — malformed navigation", () => {
  const server = createTestServer({
    navigation: "malformed",
    document: "success",
  });

  beforeAll(() => server.start());
  afterEach(() => {
    server.resetHandlers();
    mockSetSidebar.mockClear();
  });
  afterAll(() => server.stop());

  it("renders a stable validation-error state and does not render article content", async () => {
    renderReadingShell();

    // Wait for the validation error to resolve
    await waitFor(() => {
      expect(screen.getByTestId("navigation-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("article-content")).not.toBeInTheDocument();
  });
});
