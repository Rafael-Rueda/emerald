import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Alert, AlertTitle, AlertDescription } from "./alert";

describe("Alert", () => {
  it("renders with default variant", () => {
    render(
      <Alert>
        <AlertTitle>Default Alert</AlertTitle>
        <AlertDescription>Default description</AlertDescription>
      </Alert>
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Default Alert")).toBeInTheDocument();
    expect(screen.getByText("Default description")).toBeInTheDocument();
  });

  it("renders with info variant", () => {
    render(
      <Alert variant="info">
        <AlertTitle>Info</AlertTitle>
        <AlertDescription>Information message</AlertDescription>
      </Alert>
    );
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("primary");
  });

  it("renders with success variant", () => {
    render(
      <Alert variant="success">
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>Operation succeeded</AlertDescription>
      </Alert>
    );
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("green");
  });

  it("renders with warning variant", () => {
    render(
      <Alert variant="warning">
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Please be careful</AlertDescription>
      </Alert>
    );
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("yellow");
  });

  it("renders with destructive variant", () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong</AlertDescription>
      </Alert>
    );
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("destructive");
  });

  it("renders title with proper heading role", () => {
    render(
      <Alert>
        <AlertTitle>Title</AlertTitle>
      </Alert>
    );
    expect(screen.getByRole("heading", { level: 5 })).toHaveTextContent("Title");
  });

  it("merges custom className on Alert", () => {
    render(<Alert className="custom-class">Content</Alert>);
    expect(screen.getByRole("alert").className).toContain("custom-class");
  });

  it("merges custom className on AlertTitle", () => {
    render(
      <Alert>
        <AlertTitle className="title-class">Title</AlertTitle>
      </Alert>
    );
    expect(screen.getByText("Title").className).toContain("title-class");
  });

  it("merges custom className on AlertDescription", () => {
    render(
      <Alert>
        <AlertDescription className="desc-class">Desc</AlertDescription>
      </Alert>
    );
    expect(screen.getByText("Desc").className).toContain("desc-class");
  });

  it("forwards ref on Alert", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Alert ref={ref}>Content</Alert>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("renders with icon support (svg positioning)", () => {
    render(
      <Alert>
        <svg data-testid="icon" />
        <AlertTitle>With Icon</AlertTitle>
        <AlertDescription>Has icon</AlertDescription>
      </Alert>
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("With Icon")).toBeInTheDocument();
  });
});
