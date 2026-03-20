import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@emerald/test-utils";
import { DocumentError } from "./document-error";

describe("DocumentError", () => {
  it("renders a request error state", () => {
    renderWithProviders(<DocumentError message="Request failed with status 500" />);
    expect(screen.getByTestId("document-error")).toBeInTheDocument();
    expect(screen.getByText("Failed to load document")).toBeInTheDocument();
  });

  it("renders a validation error state", () => {
    renderWithProviders(
      <DocumentError message="Invalid schema" isValidationError />,
    );
    expect(screen.getByTestId("document-error")).toBeInTheDocument();
    expect(screen.getByText("Invalid document data")).toBeInTheDocument();
  });

  it("uses destructive alert variant", () => {
    renderWithProviders(<DocumentError message="error" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows safe error message for request errors", () => {
    renderWithProviders(<DocumentError message="500" />);
    expect(
      screen.getByText(/Something went wrong while loading this document/),
    ).toBeInTheDocument();
  });

  it("shows safe error message for validation errors", () => {
    renderWithProviders(
      <DocumentError message="bad schema" isValidationError />,
    );
    expect(
      screen.getByText(/document data received from the server is invalid/),
    ).toBeInTheDocument();
  });
});
