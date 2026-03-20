import type { Meta, StoryObj } from "@storybook/react-vite";
import React from "react";
import { WorkspaceShell } from "./workspace-shell";

const sampleNav = (
  <nav className="space-y-1">
    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Admin
    </p>
    <a href="#" className="block rounded-md bg-primary/10 px-2 py-1.5 text-sm font-medium text-primary">
      Documents
    </a>
    <a href="#" className="block rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent">
      Navigation
    </a>
    <a href="#" className="block rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent">
      Versions
    </a>
    <a href="#" className="block rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent">
      AI Context
    </a>
  </nav>
);

const sampleContent = (
  <div className="space-y-4">
    <h1 className="text-2xl font-bold text-foreground">Documents</h1>
    <p className="text-muted-foreground">
      Manage your documentation content from this admin panel.
    </p>
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded border border-border p-3">
          <span className="text-sm font-medium text-foreground">
            Getting Started Guide
          </span>
          <span className="text-xs text-muted-foreground">v2.0</span>
        </div>
        <div className="flex items-center justify-between rounded border border-border p-3">
          <span className="text-sm font-medium text-foreground">
            API Reference
          </span>
          <span className="text-xs text-muted-foreground">v1.5</span>
        </div>
      </div>
    </div>
  </div>
);

const meta = {
  title: "Shells/Workspace Shell",
  component: WorkspaceShell,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof WorkspaceShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Desktop-width workspace admin shell with navigation sidebar. */
export const Desktop: Story = {
  args: {
    navigation: sampleNav,
    children: sampleContent,
  },
};

/** Narrow viewport (~390px) — navigation is hidden behind a hamburger menu. */
export const Narrow: Story = {
  args: {
    navigation: sampleNav,
    children: sampleContent,
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};
