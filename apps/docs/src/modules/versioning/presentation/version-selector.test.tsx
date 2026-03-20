import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { VersionSelector } from "./version-selector";

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
}));

const versions = [
  {
    id: "ver-v1",
    label: "v1",
    slug: "v1",
    status: "published" as const,
    isDefault: true,
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ver-v2",
    label: "v2",
    slug: "v2",
    status: "draft" as const,
    isDefault: false,
    createdAt: "2025-06-01T00:00:00Z",
  },
];

describe("VersionSelector", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("shows the active version label and available options", () => {
    render(
      <VersionSelector
        space="guides"
        activeVersion="v1"
        slug="getting-started"
        versions={versions}
      />,
    );

    expect(screen.getByTestId("version-active-label")).toHaveTextContent("v1");
    expect(screen.getByTestId("version-option-v1")).toBeInTheDocument();
    expect(screen.getByTestId("version-option-v2")).toBeInTheDocument();
  });

  it("updates the route version segment when a new version is selected", () => {
    render(
      <VersionSelector
        space="guides"
        activeVersion="v1"
        slug="getting-started"
        versions={versions}
      />,
    );

    fireEvent.change(screen.getByTestId("version-select"), {
      target: { value: "v2" },
    });

    expect(pushMock).toHaveBeenCalledWith("/guides/v2/getting-started");
  });

  it("does not push a route when selecting the already active version", () => {
    render(
      <VersionSelector
        space="guides"
        activeVersion="v1"
        slug="getting-started"
        versions={versions}
      />,
    );

    fireEvent.change(screen.getByTestId("version-select"), {
      target: { value: "v1" },
    });

    expect(pushMock).not.toHaveBeenCalled();
  });
});
