import type { Meta, StoryObj } from "@storybook/react-vite";
import React from "react";
import { Button } from "./button";

const meta = {
  title: "Primitives/Action/Button",
  component: Button,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A shared action button primitive supporting multiple visual variants and sizes. " +
          "Includes visible focus ring treatment for keyboard navigation. " +
          "Built with CVA for variant composition and Tailwind design tokens.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
      description: "Visual variant of the button",
    },
    size: {
      control: { type: "select" },
      options: ["default", "sm", "lg", "icon"],
      description: "Size preset for the button",
    },
    disabled: {
      control: { type: "boolean" },
      description: "Whether the button is disabled",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default primary action button. */
export const Default: Story = {
  args: {
    children: "Button",
  },
};

/** All variant options displayed side by side. */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

/** All size options displayed side by side. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Star">★</Button>
    </div>
  ),
};

/** Disabled button state. */
export const Disabled: Story = {
  args: {
    children: "Disabled",
    disabled: true,
  },
};

/**
 * Focus treatment demonstration.
 * Use Tab key to move focus to the button and observe the visible focus ring.
 */
export const FocusTreatment: Story = {
  args: {
    children: "Tab to focus me",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Press Tab to focus this button and observe the visible focus ring. " +
          "The ring uses the `--ring` design token for consistent focus treatment.",
      },
    },
  },
};
