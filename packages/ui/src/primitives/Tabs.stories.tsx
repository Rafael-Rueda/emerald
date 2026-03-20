import type { Meta, StoryObj } from "@storybook/react-vite";
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

const meta = {
  title: "Primitives/Navigation & Content/Tabs",
  component: Tabs,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A selection-oriented navigation/content primitive built on Radix UI Tabs. " +
          "Supports keyboard focus and selection: Tab to enter, Arrow keys to move between tabs, " +
          "and the active tab is visually distinguished. Includes visible focus ring treatment.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default tabs with three panels. */
export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-96">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="features">Features</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <div className="rounded-md border border-border p-4">
          <h3 className="text-lg font-semibold text-foreground">Overview</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            This is the overview panel. It shows general information about the item.
          </p>
        </div>
      </TabsContent>
      <TabsContent value="features">
        <div className="rounded-md border border-border p-4">
          <h3 className="text-lg font-semibold text-foreground">Features</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            This panel describes the key features and capabilities.
          </p>
        </div>
      </TabsContent>
      <TabsContent value="settings">
        <div className="rounded-md border border-border p-4">
          <h3 className="text-lg font-semibold text-foreground">Settings</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Configuration and preferences can be adjusted here.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  ),
};

/**
 * Keyboard behavior demonstration.
 *
 * - **Tab**: Focus the tab list
 * - **Arrow Left/Right**: Move between tabs
 * - **Home/End**: Jump to first/last tab
 * - Active tab gets a distinct visual treatment (background, shadow)
 */
export const KeyboardNavigation: Story = {
  render: () => (
    <Tabs defaultValue="first" className="w-96">
      <TabsList>
        <TabsTrigger value="first">First</TabsTrigger>
        <TabsTrigger value="second">Second</TabsTrigger>
        <TabsTrigger value="third">Third</TabsTrigger>
        <TabsTrigger value="fourth">Fourth</TabsTrigger>
      </TabsList>
      <TabsContent value="first">
        <div className="rounded-md border border-border p-4 text-sm text-foreground">
          Focus the tabs above and use ← → arrow keys to navigate. Observe focus ring and active state.
        </div>
      </TabsContent>
      <TabsContent value="second">
        <div className="rounded-md border border-border p-4 text-sm text-foreground">
          Second tab content. The selected tab shows a distinct active style.
        </div>
      </TabsContent>
      <TabsContent value="third">
        <div className="rounded-md border border-border p-4 text-sm text-foreground">
          Third tab content.
        </div>
      </TabsContent>
      <TabsContent value="fourth">
        <div className="rounded-md border border-border p-4 text-sm text-foreground">
          Fourth tab. Arrow right from here wraps back to the first tab.
        </div>
      </TabsContent>
    </Tabs>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Focus the tab triggers with Tab, then use Arrow Left/Right to navigate. " +
          "The active tab is highlighted with background and shadow. " +
          "Focus ring is visible when navigating with keyboard.",
      },
    },
  },
};

/** Tabs with disabled tab. */
export const WithDisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="enabled" className="w-80">
      <TabsList>
        <TabsTrigger value="enabled">Enabled</TabsTrigger>
        <TabsTrigger value="disabled" disabled>Disabled</TabsTrigger>
        <TabsTrigger value="another">Another</TabsTrigger>
      </TabsList>
      <TabsContent value="enabled">
        <div className="rounded-md border border-border p-4 text-sm text-foreground">
          Active content. The middle tab is disabled and cannot be selected.
        </div>
      </TabsContent>
      <TabsContent value="another">
        <div className="rounded-md border border-border p-4 text-sm text-foreground">
          Another tab content.
        </div>
      </TabsContent>
    </Tabs>
  ),
};
