import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThemeToggle } from "./theme-toggle";

const meta = {
  title: "Foundations/Theme Toggle",
  component: ThemeToggle,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default theme toggle button. Click to switch between light and dark. */
export const Default: Story = {};
