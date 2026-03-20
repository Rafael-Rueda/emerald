import type { Meta, StoryObj } from "@storybook/react-vite";
import React from "react";
import { TextInput } from "./text-input";

const meta = {
  title: "Primitives/Text Input/TextInput",
  component: TextInput,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A shared text input primitive with optional label and error state. " +
          "Includes visible focus ring treatment for keyboard navigation. " +
          "Uses Tailwind design tokens for consistent styling.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    label: {
      control: { type: "text" },
      description: "Label text above the input",
    },
    placeholder: {
      control: { type: "text" },
      description: "Placeholder text",
    },
    error: {
      control: { type: "text" },
      description: "Error message below the input",
    },
    disabled: {
      control: { type: "boolean" },
      description: "Whether the input is disabled",
    },
  },
} satisfies Meta<typeof TextInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default text input with label and placeholder. */
export const Default: Story = {
  args: {
    label: "Username",
    placeholder: "Enter your username",
  },
};

/** Text input with an error state. */
export const WithError: Story = {
  args: {
    label: "Email",
    placeholder: "Enter your email",
    error: "Please enter a valid email address",
  },
};

/** Disabled text input. */
export const Disabled: Story = {
  args: {
    label: "Read-only field",
    placeholder: "Cannot edit",
    disabled: true,
  },
};

/** Text input without a label. */
export const WithoutLabel: Story = {
  args: {
    placeholder: "Search...",
  },
};

/** Multiple input states side by side. */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-80">
      <TextInput label="Normal" placeholder="Type here..." />
      <TextInput label="With value" defaultValue="Hello world" />
      <TextInput label="Error" error="This field is required" placeholder="Required" />
      <TextInput label="Disabled" disabled placeholder="Cannot edit" />
    </div>
  ),
};

/**
 * Focus treatment demonstration.
 * Use Tab key to move focus and observe the visible focus ring.
 */
export const FocusTreatment: Story = {
  args: {
    label: "Tab to focus me",
    placeholder: "Observe focus ring",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Press Tab to focus this input and observe the visible focus ring. " +
          "Error state changes the ring to use the destructive token.",
      },
    },
  },
};
