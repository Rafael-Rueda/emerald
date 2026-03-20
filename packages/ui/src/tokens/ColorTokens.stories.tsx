import type { Meta, StoryObj } from "@storybook/react-vite";
import { ColorTokens } from "./ColorTokens";

const meta = {
  title: "Foundations/Tokens/Colors",
  component: ColorTokens,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof ColorTokens>;

export default meta;
type Story = StoryObj<typeof meta>;

/** All semantic color roles with foreground pairs. */
export const Default: Story = {};
