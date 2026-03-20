import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@emerald/test-utils";
import { documentGettingStarted, documentApiReference } from "@emerald/mocks/fixtures";
import { DocumentContent } from "./document-content";

describe("DocumentContent", () => {
  it("renders the document title", () => {
    renderWithProviders(<DocumentContent document={documentGettingStarted} />);
    expect(screen.getByTestId("doc-title")).toHaveTextContent("Getting Started");
  });

  it("renders the document body as HTML", () => {
    renderWithProviders(<DocumentContent document={documentGettingStarted} />);
    const body = screen.getByTestId("doc-body");
    expect(body).toHaveTextContent("Installation");
    expect(body).toHaveTextContent("Follow these steps to install Emerald");
  });

  it("renders the document meta information", () => {
    renderWithProviders(<DocumentContent document={documentGettingStarted} />);
    expect(screen.getByTestId("doc-version-label")).toHaveTextContent("v1");
    expect(screen.getByTestId("doc-path-label")).toHaveTextContent(
      "guides/getting-started",
    );
  });

  it("renders a different document correctly", () => {
    renderWithProviders(<DocumentContent document={documentApiReference} />);
    expect(screen.getByTestId("doc-title")).toHaveTextContent("API Reference");
    expect(screen.getByTestId("doc-body")).toHaveTextContent(
      "API reference for the Emerald platform",
    );
  });

  it("renders the updated date", () => {
    renderWithProviders(<DocumentContent document={documentGettingStarted} />);
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });
});
