import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./dialog";

function TestDialog({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button>Open dialog</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Test Dialog</DialogTitle>
          <DialogDescription>This is a test dialog description.</DialogDescription>
        </DialogHeader>
        <p>Dialog body content</p>
        <DialogFooter>
          <DialogClose asChild>
            <button>Cancel</button>
          </DialogClose>
          <button>Confirm</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("does not show content when closed", () => {
    render(<TestDialog />);
    expect(screen.queryByText("Test Dialog")).not.toBeInTheDocument();
  });

  it("opens dialog when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<TestDialog />);
    await user.click(screen.getByRole("button", { name: /open dialog/i }));
    expect(screen.getByText("Test Dialog")).toBeInTheDocument();
    expect(screen.getByText("This is a test dialog description.")).toBeInTheDocument();
    expect(screen.getByText("Dialog body content")).toBeInTheDocument();
  });

  it("renders header, footer, title, and description", async () => {
    const user = userEvent.setup();
    render(<TestDialog />);
    await user.click(screen.getByRole("button", { name: /open dialog/i }));
    expect(screen.getByText("Test Dialog")).toBeInTheDocument();
    expect(screen.getByText("This is a test dialog description.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
  });

  it("closes dialog with the close button (X icon)", async () => {
    const user = userEvent.setup();
    render(<TestDialog />);
    await user.click(screen.getByRole("button", { name: /open dialog/i }));
    expect(screen.getByText("Test Dialog")).toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: /close/i });
    await user.click(closeButton);
    await waitFor(() => {
      expect(screen.queryByText("Test Dialog")).not.toBeInTheDocument();
    });
  });

  it("closes dialog with Escape key", async () => {
    const user = userEvent.setup();
    render(<TestDialog />);
    await user.click(screen.getByRole("button", { name: /open dialog/i }));
    expect(screen.getByText("Test Dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByText("Test Dialog")).not.toBeInTheDocument();
    });
  });

  it("supports keyboard tabbing through focusable elements inside the dialog", async () => {
    const user = userEvent.setup();
    render(<TestDialog />);
    await user.click(screen.getByRole("button", { name: /open dialog/i }));

    // Tab through focusable elements inside the dialog
    await user.tab();
    // The close button or Cancel should receive focus
    const focusedElement = document.activeElement;
    expect(focusedElement?.tagName).toBe("BUTTON");
  });

  it("calls onOpenChange callback", async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();
    render(<TestDialog onOpenChange={handleOpenChange} />);
    await user.click(screen.getByRole("button", { name: /open dialog/i }));
    expect(handleOpenChange).toHaveBeenCalledWith(true);
  });

  it("close button inside footer closes the dialog", async () => {
    const user = userEvent.setup();
    render(<TestDialog />);
    await user.click(screen.getByRole("button", { name: /open dialog/i }));
    expect(screen.getByText("Test Dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByText("Test Dialog")).not.toBeInTheDocument();
    });
  });

  it("has visible focus treatment on content", async () => {
    const user = userEvent.setup();
    render(<TestDialog />);
    await user.click(screen.getByRole("button", { name: /open dialog/i }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("focus-visible:ring-2");
  });
});
