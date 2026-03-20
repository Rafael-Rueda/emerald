import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@emerald/test-utils";
import { DocumentUnavailable } from "./document-unavailable";

describe("DocumentUnavailable", () => {
  it("renders the unavailable alert", () => {
    renderWithProviders(
      <DocumentUnavailable space="guides" version="v1" slug="missing-doc" />,
    );
    expect(screen.getByTestId("document-unavailable")).toBeInTheDocument();
    expect(screen.getByText("Document unavailable")).toBeInTheDocument();
  });

  it("shows the specific slug in the message", () => {
    renderWithProviders(
      <DocumentUnavailable space="guides" version="v1" slug="missing-doc" />,
    );
    expect(screen.getByText("missing-doc")).toBeInTheDocument();
  });

  it("shows the space and version in the message", () => {
    renderWithProviders(
      <DocumentUnavailable space="api" version="v2" slug="overview" />,
    );
    expect(screen.getByText(/api\/v2/)).toBeInTheDocument();
  });

  it("renders as an alert role", () => {
    renderWithProviders(
      <DocumentUnavailable space="guides" version="v1" slug="missing-doc" />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
