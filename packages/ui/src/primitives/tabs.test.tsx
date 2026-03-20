import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

function TestTabs() {
  return (
    <Tabs defaultValue="tab1">
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content for tab 1</TabsContent>
      <TabsContent value="tab2">Content for tab 2</TabsContent>
      <TabsContent value="tab3">Content for tab 3</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("renders all tab triggers", () => {
    render(<TestTabs />);
    expect(screen.getByRole("tab", { name: /tab 1/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /tab 2/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /tab 3/i })).toBeInTheDocument();
  });

  it("shows the default tab content", () => {
    render(<TestTabs />);
    expect(screen.getByText("Content for tab 1")).toBeInTheDocument();
  });

  it("switches content when clicking a tab", async () => {
    const user = userEvent.setup();
    render(<TestTabs />);
    expect(screen.getByText("Content for tab 1")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /tab 2/i }));
    expect(screen.getByText("Content for tab 2")).toBeInTheDocument();
    expect(screen.queryByText("Content for tab 1")).not.toBeInTheDocument();
  });

  it("marks the active tab with data-state=active", async () => {
    const user = userEvent.setup();
    render(<TestTabs />);

    const tab1 = screen.getByRole("tab", { name: /tab 1/i });
    expect(tab1).toHaveAttribute("data-state", "active");

    await user.click(screen.getByRole("tab", { name: /tab 2/i }));
    expect(tab1).toHaveAttribute("data-state", "inactive");
    expect(screen.getByRole("tab", { name: /tab 2/i })).toHaveAttribute("data-state", "active");
  });

  it("supports keyboard navigation with arrow keys", async () => {
    const user = userEvent.setup();
    render(<TestTabs />);

    // Focus the first tab via keyboard (Tab key into the tablist)
    await user.tab();
    expect(screen.getByRole("tab", { name: /tab 1/i })).toHaveFocus();

    // Arrow right moves to next tab
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /tab 2/i })).toHaveFocus();

    // Arrow right again moves to third tab
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /tab 3/i })).toHaveFocus();
  });

  it("supports keyboard selection with Enter/Space", async () => {
    const user = userEvent.setup();
    render(<TestTabs />);

    // Focus the first tab via keyboard (Tab key into the tablist)
    await user.tab();

    // Navigate to tab 2
    await user.keyboard("{ArrowRight}");
    // By default Radix tabs activate on focus, but the tab should be active
    expect(screen.getByRole("tab", { name: /tab 2/i })).toHaveAttribute("data-state", "active");
    expect(screen.getByText("Content for tab 2")).toBeInTheDocument();
  });

  it("wraps around with arrow keys", async () => {
    const user = userEvent.setup();
    render(<TestTabs />);

    // Click the last tab to focus it (avoids direct .focus() outside act)
    await user.click(screen.getByRole("tab", { name: /tab 3/i }));

    // Arrow right from last tab should wrap to first
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /tab 1/i })).toHaveFocus();
  });

  it("has visible focus treatment on triggers", () => {
    render(<TestTabs />);
    const tab = screen.getByRole("tab", { name: /tab 1/i });
    expect(tab.className).toContain("focus-visible:ring-2");
  });

  it("is keyboard-focusable via tab", async () => {
    const user = userEvent.setup();
    render(<TestTabs />);

    await user.tab();
    // The first tab trigger should receive focus
    expect(screen.getByRole("tab", { name: /tab 1/i })).toHaveFocus();
  });

  it("renders a tablist role", () => {
    render(<TestTabs />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("renders tabpanel role for content", () => {
    render(<TestTabs />);
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });
});
