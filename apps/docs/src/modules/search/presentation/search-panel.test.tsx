import React from "react";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { renderWithProviders, createTestServer } from "@emerald/test-utils";
import { SearchPanel } from "./search-panel";

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

function renderSearchPanel() {
  return renderWithProviders(
    <SearchPanel currentRoute={{ space: "guides", version: "v1", slug: "getting-started" }} />,
  );
}

async function submitQuery(query: string) {
  const user = userEvent.setup();
  await user.clear(screen.getByTestId("search-input"));
  await user.type(screen.getByTestId("search-input"), query);
  await user.click(screen.getByTestId("search-submit"));
}

describe("SearchPanel — successful search", () => {
  const server = createTestServer({ search: "success" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("renders a search entry point", () => {
    renderSearchPanel();

    expect(screen.getByTestId("search-panel")).toBeInTheDocument();
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
    expect(screen.getByTestId("search-submit")).toBeInTheDocument();
  });

  it("shows disambiguating route context for similarly named documents", async () => {
    renderSearchPanel();

    await submitQuery("getting");

    await waitFor(() => {
      expect(screen.getByTestId("search-results")).toBeInTheDocument();
    });

    const titleMatches = screen.getAllByText("Getting Started");
    expect(titleMatches.length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByTestId("search-result-context-sr-getting-started"),
    ).toHaveTextContent("guides / v1");
    expect(
      screen.getByTestId("search-result-context-sr-getting-started-v2"),
    ).toHaveTextContent("guides / v2");

    expect(
      screen.getByTestId("search-result-link-sr-getting-started"),
    ).toHaveAttribute("href", "/guides/v1/getting-started");
    expect(
      screen.getByTestId("search-result-link-sr-getting-started-v2"),
    ).toHaveAttribute("href", "/guides/v2/getting-started");

    expect(screen.getAllByTestId("search-result-item")).toHaveLength(2);
  });
});

describe("SearchPanel — non-success states", () => {
  const server = createTestServer({ search: "success" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("shows an empty state when no results match", async () => {
    renderSearchPanel();

    await submitQuery("zzzzzzzzzzz");

    await waitFor(() => {
      expect(screen.getByTestId("search-empty")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("search-results")).not.toBeInTheDocument();
  });

  it("shows a request error state", async () => {
    server.use(
      http.get("*/api/search", () => {
        return HttpResponse.json({ error: "Search unavailable" }, { status: 500 });
      }),
    );

    renderSearchPanel();
    await submitQuery("getting");

    await waitFor(() => {
      expect(screen.getByTestId("search-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("search-results")).not.toBeInTheDocument();
  });

  it("shows a validation error state for malformed payloads", async () => {
    server.use(
      http.get("*/api/search", () => {
        return HttpResponse.json({ query: "getting", results: "broken" }, { status: 200 });
      }),
    );

    renderSearchPanel();
    await submitQuery("getting");

    await waitFor(() => {
      expect(screen.getByTestId("search-validation-error")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("search-results")).not.toBeInTheDocument();
  });

  it("clears prior results while a newer query is loading", async () => {
    renderSearchPanel();
    await submitQuery("getting");

    await waitFor(() => {
      expect(screen.getByTestId("search-results")).toBeInTheDocument();
    });

    server.use(
      http.get("*/api/search", async () => {
        await delay("infinite");
        return HttpResponse.json({ query: "never", results: [], totalCount: 0 }, { status: 200 });
      }),
    );

    await submitQuery("api");

    await waitFor(() => {
      expect(screen.getByTestId("search-loading")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("search-results")).not.toBeInTheDocument();
    expect(screen.queryByText("Getting Started")).not.toBeInTheDocument();
  });
});
