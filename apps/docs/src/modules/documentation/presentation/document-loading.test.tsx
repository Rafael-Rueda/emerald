import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@emerald/test-utils";
import { DocumentLoading } from "./document-loading";

describe("DocumentLoading", () => {
  it("renders a loading skeleton", () => {
    renderWithProviders(<DocumentLoading />);
    expect(screen.getByTestId("document-loading")).toBeInTheDocument();
  });

  it("has a status role for accessibility", () => {
    renderWithProviders(<DocumentLoading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has an accessible label", () => {
    renderWithProviders(<DocumentLoading />);
    expect(screen.getByLabelText("Loading document")).toBeInTheDocument();
  });

  it("includes a screen reader text", () => {
    renderWithProviders(<DocumentLoading />);
    expect(screen.getByText("Loading document…")).toBeInTheDocument();
  });
});
