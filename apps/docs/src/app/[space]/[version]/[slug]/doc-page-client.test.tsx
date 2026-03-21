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
import { documentGettingStarted } from "@emerald/mocks";
import { DocPageClient } from "./doc-page-client";

beforeEach(() => {
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  }));
});

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

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/guides/v1/getting-started",
  useSearchParams: () => new URLSearchParams(),
}));

describe("DocPageClient — version metadata success", () => {
  const server = createTestServer({
    document: "success",
    navigation: "success",
    versions: "success",
  });

  beforeAll(() => server.start());
  afterEach(() => {
    server.resetHandlers();
    pushMock.mockClear();
  });
  afterAll(() => server.stop());

  it("shows active version and available options on resolved docs pages", async () => {
    renderWithProviders(
      <DocPageClient
        space="guides"
        version="v1"
        slug="getting-started"
        initialDocumentState={{
          state: "success",
          document: documentGettingStarted,
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("version-selector")).toBeInTheDocument();
    });

    expect(screen.getByTestId("version-active-label")).toHaveTextContent("v1");
    expect(screen.getByTestId("version-option-v1")).toBeInTheDocument();
    expect(screen.getByTestId("version-option-v2")).toBeInTheDocument();
  });

  it("keeps selected target version context when target slug is unavailable", async () => {
    renderWithProviders(
      <DocPageClient
        space="guides"
        version="v2"
        slug="api-reference"
        initialDocumentState={{ state: "not-found" }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("document-unavailable")).toBeInTheDocument();
    });

    expect(screen.getByText(/guides\/v2/)).toBeInTheDocument();
    expect(screen.getByTestId("version-active-label")).toHaveTextContent("v2");
    expect(screen.getByTestId("version-select")).toHaveValue("v2");
  });
});

describe("DocPageClient — malformed version metadata", () => {
  const server = createTestServer({
    document: "success",
    navigation: "success",
    versions: "malformed",
  });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("shows version metadata error state instead of partial rendering", async () => {
    renderWithProviders(
      <DocPageClient
        space="guides"
        version="v1"
        slug="getting-started"
        initialDocumentState={{
          state: "success",
          document: documentGettingStarted,
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("version-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("reading-shell")).not.toBeInTheDocument();
    expect(screen.queryByTestId("document-content")).not.toBeInTheDocument();
  });
});
