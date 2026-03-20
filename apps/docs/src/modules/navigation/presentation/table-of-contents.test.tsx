import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TocEntry } from "../domain/navigation-context";
import { TableOfContents } from "./table-of-contents";

// Mock IntersectionObserver for jsdom
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
const mockUnobserve = vi.fn();

beforeEach(() => {
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: mockObserve,
    disconnect: mockDisconnect,
    unobserve: mockUnobserve,
  }));
});

afterEach(() => {
  mockObserve.mockClear();
  mockDisconnect.mockClear();
  mockUnobserve.mockClear();
});

describe("TableOfContents — with headings", () => {
  const entries: TocEntry[] = [
    { id: "installation", text: "Installation", level: 2 },
    { id: "configuration", text: "Configuration", level: 2 },
  ];

  beforeEach(() => {
    // Create mock heading elements in the DOM for the observer
    entries.forEach((entry) => {
      const existing = document.getElementById(entry.id);
      if (existing) existing.remove();
      const el = document.createElement("h2");
      el.id = entry.id;
      el.textContent = entry.text;
      document.body.appendChild(el);
    });
  });

  it("renders the TOC with entries", () => {
    render(<TableOfContents entries={entries} />);

    expect(screen.getByTestId("toc")).toBeInTheDocument();
    expect(screen.getByTestId("toc-nav")).toBeInTheDocument();
    expect(screen.getByText("On this page")).toBeInTheDocument();
  });

  it("renders all heading entries", () => {
    render(<TableOfContents entries={entries} />);

    expect(screen.getByTestId("toc-entry-installation")).toBeInTheDocument();
    expect(screen.getByTestId("toc-entry-configuration")).toBeInTheDocument();
  });

  it("links TOC entries to their heading anchors", () => {
    render(<TableOfContents entries={entries} />);

    const link = screen.getByTestId("toc-entry-installation");
    expect(link).toHaveAttribute("href", "#installation");
  });

  it("displays correct text for each entry", () => {
    render(<TableOfContents entries={entries} />);

    expect(screen.getByTestId("toc-entry-installation")).toHaveTextContent(
      "Installation",
    );
    expect(screen.getByTestId("toc-entry-configuration")).toHaveTextContent(
      "Configuration",
    );
  });

  it("has an accessible table of contents landmark", () => {
    render(<TableOfContents entries={entries} />);

    // TOC uses an aside (complementary) landmark with the label
    expect(
      screen.getByRole("complementary", { name: /table of contents/i }),
    ).toBeInTheDocument();
  });
});

describe("TableOfContents — heading-less document (no entries)", () => {
  it("shows the no-sections intentional state", () => {
    render(<TableOfContents entries={[]} />);

    expect(screen.getByTestId("toc-empty")).toBeInTheDocument();
    expect(screen.getByTestId("toc-no-sections")).toBeInTheDocument();
    expect(screen.getByText("No sections in this document.")).toBeInTheDocument();
  });

  it("does not render TOC navigation links", () => {
    render(<TableOfContents entries={[]} />);

    expect(screen.queryByTestId("toc-nav")).not.toBeInTheDocument();
  });

  it("still shows the On this page heading for consistency", () => {
    render(<TableOfContents entries={[]} />);

    expect(screen.getByText("On this page")).toBeInTheDocument();
  });
});
