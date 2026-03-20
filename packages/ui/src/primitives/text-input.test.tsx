import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { TextInput } from "./text-input";

describe("TextInput", () => {
  it("renders a text input", () => {
    render(<TextInput placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("renders with a label", () => {
    render(<TextInput label="Username" />);
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
  });

  it("displays error message", () => {
    render(<TextInput label="Email" error="Email is required" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Email is required");
  });

  it("sets aria-invalid when error is present", () => {
    render(<TextInput label="Email" error="Invalid" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("sets aria-describedby to link input with error", () => {
    render(<TextInput label="Email" id="email" error="Bad" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-describedby", "email-error");
    expect(screen.getByRole("alert")).toHaveAttribute("id", "email-error");
  });

  it("does not set aria-invalid without error", () => {
    render(<TextInput label="Name" />);
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
  });

  it("handles user input", async () => {
    const user = userEvent.setup();
    render(<TextInput label="Search" />);
    const input = screen.getByLabelText("Search");
    await user.type(input, "hello");
    expect(input).toHaveValue("hello");
  });

  it("supports disabled state", () => {
    render(<TextInput label="Disabled" disabled />);
    expect(screen.getByLabelText("Disabled")).toBeDisabled();
  });

  it("merges custom className", () => {
    render(<TextInput className="custom-class" />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("custom-class");
  });

  it("forwards ref", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<TextInput ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("has visible focus treatment class", () => {
    render(<TextInput />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("focus-visible:ring-2");
  });

  it("is keyboard-focusable via tab", async () => {
    const user = userEvent.setup();
    render(<TextInput label="Tab Target" />);
    await user.tab();
    expect(screen.getByLabelText("Tab Target")).toHaveFocus();
  });

  it("calls onChange when typing", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TextInput label="Input" onChange={handleChange} />);
    await user.type(screen.getByLabelText("Input"), "a");
    expect(handleChange).toHaveBeenCalled();
  });
});
