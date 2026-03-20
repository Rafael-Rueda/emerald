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

import type { NavigationItem } from "@emerald/contracts";
import { Sidebar } from "./sidebar";

const items: NavigationItem[] = [
  {
    id: "nav-getting-started",
    label: "Getting Started",
    slug: "getting-started",
    children: [],
  },
  {
    id: "nav-api-reference",
    label: "API Reference",
    slug: "api-reference",
    children: [
      {
        id: "nav-endpoints",
        label: "Endpoints",
        slug: "endpoints",
        children: [],
      },
    ],
  },
];

describe("Sidebar", () => {
  it("renders all top-level navigation items", () => {
    render(
      <Sidebar
        items={items}
        activeSlug="getting-started"
        space="guides"
        version="v1"
      />,
    );

    expect(screen.getByText("Getting Started")).toBeInTheDocument();
    expect(screen.getByText("API Reference")).toBeInTheDocument();
  });

  it("renders nested children", () => {
    render(
      <Sidebar
        items={items}
        activeSlug="getting-started"
        space="guides"
        version="v1"
      />,
    );

    expect(screen.getByText("Endpoints")).toBeInTheDocument();
  });

  it("marks the active item with aria-current=page", () => {
    render(
      <Sidebar
        items={items}
        activeSlug="getting-started"
        space="guides"
        version="v1"
      />,
    );

    const active = screen.getByTestId("sidebar-item-getting-started");
    expect(active).toHaveAttribute("aria-current", "page");
  });

  it("does not mark non-active items with aria-current", () => {
    render(
      <Sidebar
        items={items}
        activeSlug="getting-started"
        space="guides"
        version="v1"
      />,
    );

    const inactive = screen.getByTestId("sidebar-item-api-reference");
    expect(inactive).not.toHaveAttribute("aria-current");
  });

  it("links to the correct route path", () => {
    render(
      <Sidebar
        items={items}
        activeSlug="getting-started"
        space="guides"
        version="v1"
      />,
    );

    const link = screen.getByTestId("sidebar-item-api-reference");
    expect(link).toHaveAttribute("href", "/guides/v1/api-reference");
  });

  it("has an accessible navigation role", () => {
    render(
      <Sidebar
        items={items}
        activeSlug="getting-started"
        space="guides"
        version="v1"
      />,
    );

    expect(screen.getByTestId("sidebar-nav")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: /document navigation/i }),
    ).toBeInTheDocument();
  });

  it("updates active state when activeSlug changes", () => {
    const { rerender } = render(
      <Sidebar
        items={items}
        activeSlug="getting-started"
        space="guides"
        version="v1"
      />,
    );

    expect(
      screen.getByTestId("sidebar-item-getting-started"),
    ).toHaveAttribute("aria-current", "page");

    rerender(
      <Sidebar
        items={items}
        activeSlug="api-reference"
        space="guides"
        version="v1"
      />,
    );

    expect(
      screen.getByTestId("sidebar-item-getting-started"),
    ).not.toHaveAttribute("aria-current");
    expect(
      screen.getByTestId("sidebar-item-api-reference"),
    ).toHaveAttribute("aria-current", "page");
  });
});
