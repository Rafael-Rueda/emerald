import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@emerald/test-utils";
import { documentGettingStarted, documentApiReference } from "@emerald/mocks/fixtures";
import type { Document } from "@emerald/contracts";
import DOMPurify from "isomorphic-dompurify";
import {
  DOCUMENT_HTML_SANITIZE_CONFIG,
  DocumentContent,
} from "./document-content";

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

  it("formats the updated date using en-US locale", () => {
    const localeSpy = vi
      .spyOn(Date.prototype, "toLocaleDateString")
      .mockReturnValue("01/02/2026");

    renderWithProviders(<DocumentContent document={documentGettingStarted} />);

    expect(localeSpy).toHaveBeenCalledWith("en-US");
    localeSpy.mockRestore();
  });

  it("sanitizes script tags before rendering", () => {
    const maliciousDocument: Document = {
      ...documentGettingStarted,
      body: "<p>safe</p><script>alert(1)</script>",
    };

    renderWithProviders(<DocumentContent document={maliciousDocument} />);

    expect(screen.getByTestId("doc-body").innerHTML).not.toContain("<script");
    expect(screen.getByTestId("doc-body")).toHaveTextContent("safe");
  });

  it("DOMPurify strips script payloads", () => {
    expect(DOMPurify.sanitize("<script>alert(1)</script>", DOCUMENT_HTML_SANITIZE_CONFIG)).toBe("");
  });

  it("DOMPurify strips onerror handlers", () => {
    const sanitized = DOMPurify.sanitize(
      "<img src=x onerror=alert(1)>",
      DOCUMENT_HTML_SANITIZE_CONFIG,
    );

    expect(sanitized).toContain("<img");
    expect(sanitized).not.toContain("onerror");
  });

  it("DOMPurify neutralizes javascript: URLs", () => {
    const sanitized = DOMPurify.sanitize(
      '<a href="javascript:void">link</a>',
      DOCUMENT_HTML_SANITIZE_CONFIG,
    );

    expect(sanitized).toContain("<a");
    expect(sanitized).not.toContain("javascript:");

    const hrefMatch = sanitized.match(/href="([^"]+)"/);
    if (hrefMatch) {
      expect(hrefMatch[1]).toMatch(/^(https?:|mailto:|tel:|\/|#)/);
    }
  });
});
