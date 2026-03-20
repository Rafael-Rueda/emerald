import type { Meta, StoryObj } from "@storybook/react-vite";
import { TypographyTokens } from "./TypographyTokens";

const meta = {
  title: "Foundations/Tokens/Typography",
  component: TypographyTokens,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof TypographyTokens>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full typography scale with font size, line height, and family previews. */
export const Default: Story = {};
