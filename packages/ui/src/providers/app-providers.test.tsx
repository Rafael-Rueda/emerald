import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";
import { AppProviders } from "./app-providers";

function QueryClientConsumer() {
  const queryClient = useQueryClient();
  return <div data-testid="has-query-client">{queryClient ? "yes" : "no"}</div>;
}

describe("AppProviders", () => {
  it("renders children", () => {
    render(
      <AppProviders>
        <div data-testid="child">Hello</div>
      </AppProviders>
    );
    expect(screen.getByTestId("child")).toHaveTextContent("Hello");
  });

  it("provides a QueryClient to children", () => {
    render(
      <AppProviders>
        <QueryClientConsumer />
      </AppProviders>
    );
    expect(screen.getByTestId("has-query-client")).toHaveTextContent("yes");
  });

  it("catches errors from children and renders fallback", () => {
    function BrokenComponent(): React.ReactNode {
      throw new Error("Test error");
    }

    // Suppress React error boundary console.error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <AppProviders>
        <BrokenComponent />
      </AppProviders>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
