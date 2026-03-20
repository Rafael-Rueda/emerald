import type { Meta, StoryObj } from "@storybook/react-vite";
import { Welcome } from "./Welcome";

const meta = {
  title: "Welcome",
  component: Welcome,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Welcome>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
