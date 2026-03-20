import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThemeToggle } from "./theme-toggle";

const meta = {
  title: "Primitives/Theme Toggle/ThemeToggle",
  component: ThemeToggle,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A shared theme toggle button that switches between light and dark themes. " +
          "Uses the ThemeProvider context to persist the choice across sessions. " +
          "Includes visible focus ring treatment for keyboard navigation.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    className: {
      control: { type: "text" },
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default theme toggle button. Click to switch between light and dark. */
export const Default: Story = {};

/**
 * Focus treatment demonstration.
 * Use Tab key to focus and observe the visible focus ring.
 */
export const FocusTreatment: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Press Tab to focus the toggle and observe the visible focus ring. " +
          "Click or press Enter/Space to toggle the theme.",
      },
    },
  },
};
