import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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

import type { BreadcrumbItem } from "../domain/navigation-context";
import { Breadcrumbs } from "./breadcrumbs";

describe("Breadcrumbs", () => {
  it("renders space and version context", () => {
    const items: BreadcrumbItem[] = [
      { label: "Getting Started", slug: "getting-started", path: "/guides/v1/getting-started" },
    ];

    render(<Breadcrumbs items={items} space="guides" version="v1" />);

    expect(screen.getByTestId("breadcrumb-space")).toHaveTextContent("guides");
    expect(screen.getByTestId("breadcrumb-version")).toHaveTextContent("v1");
  });

  it("renders the current page as non-link text", () => {
    const items: BreadcrumbItem[] = [
      { label: "Getting Started", slug: "getting-started", path: "/guides/v1/getting-started" },
    ];

    render(<Breadcrumbs items={items} space="guides" version="v1" />);

    const current = screen.getByTestId("breadcrumb-current");
    expect(current).toHaveTextContent("Getting Started");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("renders intermediate items as links", () => {
    const items: BreadcrumbItem[] = [
      { label: "API Reference", slug: "api-reference", path: "/guides/v1/api-reference" },
      { label: "Endpoints", slug: "endpoints", path: "/guides/v1/endpoints" },
    ];

    render(<Breadcrumbs items={items} space="guides" version="v1" />);

    const link = screen.getByTestId("breadcrumb-link-api-reference");
    expect(link).toHaveAttribute("href", "/guides/v1/api-reference");

    const current = screen.getByTestId("breadcrumb-current");
    expect(current).toHaveTextContent("Endpoints");
  });

  it("returns null for empty items", () => {
    const { container } = render(
      <Breadcrumbs items={[]} space="guides" version="v1" />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("has an accessible breadcrumb navigation", () => {
    const items: BreadcrumbItem[] = [
      { label: "Getting Started", slug: "getting-started", path: "/guides/v1/getting-started" },
    ];

    render(<Breadcrumbs items={items} space="guides" version="v1" />);

    expect(
      screen.getByRole("navigation", { name: /breadcrumb/i }),
    ).toBeInTheDocument();
  });
});
