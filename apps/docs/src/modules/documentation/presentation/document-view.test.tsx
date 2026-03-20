import React from "react";
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, createTestServer } from "@emerald/test-utils";
import { DocumentView } from "./document-view";

/**
 * DocumentView presentation tests.
 *
 * Tests each view state: loading, success, not-found, error, validation-error.
 * Uses MSW scenarios to simulate each backend state.
 */

describe("DocumentView — success scenario", () => {
  const server = createTestServer({ document: "success" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("shows loading state initially, then renders the document", async () => {
    renderWithProviders(
      <DocumentView
        identity={{ space: "guides", version: "v1", slug: "getting-started" }}
      />,
    );

    // Loading state should appear first
    expect(screen.getByTestId("document-loading")).toBeInTheDocument();

    // Wait for the document to load
    await waitFor(() => {
      expect(screen.getByTestId("document-content")).toBeInTheDocument();
    });

    // Verify title renders from fixture
    expect(screen.getByTestId("doc-title")).toHaveTextContent("Getting Started");

    // Verify body contains expected fragment
    expect(screen.getByTestId("doc-body")).toHaveTextContent("Follow these steps to install Emerald");
  });

  it("renders a different document for a different identity", async () => {
    renderWithProviders(
      <DocumentView
        identity={{ space: "guides", version: "v1", slug: "api-reference" }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("document-content")).toBeInTheDocument();
    });

    expect(screen.getByTestId("doc-title")).toHaveTextContent("API Reference");
    expect(screen.getByTestId("doc-body")).toHaveTextContent("API reference for the Emerald platform");
  });
});

describe("DocumentView — not-found scenario", () => {
  const server = createTestServer({ document: "success" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("shows unavailable state for a non-existent document", async () => {
    renderWithProviders(
      <DocumentView
        identity={{ space: "guides", version: "v1", slug: "nonexistent" }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("document-unavailable")).toBeInTheDocument();
    });

    expect(screen.getByText("Document unavailable")).toBeInTheDocument();
    expect(screen.getByText(/nonexistent/)).toBeInTheDocument();
    expect(screen.getByText(/guides\/v1/)).toBeInTheDocument();
  });
});

describe("DocumentView — error scenario", () => {
  const server = createTestServer({ document: "error" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("shows error state when the request fails", async () => {
    renderWithProviders(
      <DocumentView
        identity={{ space: "guides", version: "v1", slug: "getting-started" }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("document-error")).toBeInTheDocument();
    });

    expect(screen.getByText("Failed to load document")).toBeInTheDocument();
  });
});

describe("DocumentView — malformed scenario", () => {
  const server = createTestServer({ document: "malformed" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("shows validation error state when payload is malformed", async () => {
    renderWithProviders(
      <DocumentView
        identity={{ space: "guides", version: "v1", slug: "getting-started" }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("document-error")).toBeInTheDocument();
    });

    expect(screen.getByText("Invalid document data")).toBeInTheDocument();
  });
});

describe("DocumentView — loading scenario", () => {
  const server = createTestServer({ document: "loading" });

  beforeAll(() => server.start());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.stop());

  it("stays in loading state when the request never resolves", async () => {
    renderWithProviders(
      <DocumentView
        identity={{ space: "guides", version: "v1", slug: "getting-started" }}
      />,
    );

    // The loading skeleton should be visible
    expect(screen.getByTestId("document-loading")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading document")).toBeInTheDocument();

    // Wait a bit and verify it stays loading (no content or error)
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(screen.getByTestId("document-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("document-content")).not.toBeInTheDocument();
    expect(screen.queryByTestId("document-error")).not.toBeInTheDocument();
    expect(screen.queryByTestId("document-unavailable")).not.toBeInTheDocument();
  });
});
