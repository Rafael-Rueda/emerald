import type { Meta, StoryObj } from "@storybook/react-vite";
import React from "react";
import { PublicShell } from "./public-shell";

const sampleSidebar = (
  <nav className="space-y-2">
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Getting Started
    </p>
    <a href="#" className="block rounded-md px-2 py-1 text-sm text-foreground hover:bg-accent">
      Introduction
    </a>
    <a href="#" className="block rounded-md bg-primary/10 px-2 py-1 text-sm font-medium text-primary">
      Installation
    </a>
    <a href="#" className="block rounded-md px-2 py-1 text-sm text-foreground hover:bg-accent">
      Quick Start
    </a>
    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Guides
    </p>
    <a href="#" className="block rounded-md px-2 py-1 text-sm text-foreground hover:bg-accent">
      Configuration
    </a>
    <a href="#" className="block rounded-md px-2 py-1 text-sm text-foreground hover:bg-accent">
      Deployment
    </a>
  </nav>
);

const sampleContent = (
  <div className="max-w-3xl space-y-4">
    <h1 className="text-3xl font-bold text-foreground">Installation</h1>
    <p className="text-muted-foreground">
      Learn how to install and set up the Emerald documentation platform.
    </p>
    <div className="rounded-lg border border-border bg-card p-4">
      <pre className="overflow-x-auto font-mono text-sm text-foreground">
        <code>pnpm add @emerald/docs</code>
      </pre>
    </div>
    <p className="text-foreground">
      After installing, configure your project by creating a configuration
      file in the root of your repository.
    </p>
  </div>
);

const meta = {
  title: "Shells/Public Shell",
  component: PublicShell,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof PublicShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Desktop-width public documentation shell with sidebar navigation. */
export const Desktop: Story = {
  args: {
    sidebar: sampleSidebar,
    children: sampleContent,
  },
};

/** Narrow viewport (~390px) — sidebar is hidden behind a hamburger menu. */
export const Narrow: Story = {
  args: {
    sidebar: sampleSidebar,
    children: sampleContent,
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};
