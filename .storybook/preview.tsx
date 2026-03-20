import type { Preview } from "@storybook/react-vite";
import React from "react";
import { AppProviders } from "@emerald/ui/providers";
import "../packages/ui/src/styles/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <AppProviders>
        <Story />
      </AppProviders>
    ),
  ],
};

export default preview;
