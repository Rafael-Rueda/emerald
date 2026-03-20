import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { AppErrorBoundary } from "./error-boundary";

describe("AppErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <AppErrorBoundary>
        <div data-testid="child">Safe content</div>
      </AppErrorBoundary>
    );
    expect(screen.getByTestId("child")).toHaveTextContent("Safe content");
  });

  it("renders default fallback on error", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function BrokenComponent(): React.ReactNode {
      throw new Error("Boom");
    }

    render(
      <AppErrorBoundary>
        <BrokenComponent />
      </AppErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("renders custom fallback when provided", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function BrokenComponent(): React.ReactNode {
      throw new Error("Boom");
    }

    render(
      <AppErrorBoundary fallback={<div data-testid="custom-fallback">Custom error</div>}>
        <BrokenComponent />
      </AppErrorBoundary>
    );

    expect(screen.getByTestId("custom-fallback")).toHaveTextContent("Custom error");

    consoleSpy.mockRestore();
  });

  it("recovers from error when try again is clicked", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let shouldThrow = true;

    function MaybeBrokenComponent(): React.ReactNode {
      if (shouldThrow) {
        throw new Error("Boom");
      }
      return <div data-testid="recovered">Recovered</div>;
    }

    render(
      <AppErrorBoundary>
        <MaybeBrokenComponent />
      </AppErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Fix the component before retrying
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByTestId("recovered")).toHaveTextContent("Recovered");

    consoleSpy.mockRestore();
  });
});
