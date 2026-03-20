import type { Meta, StoryObj } from "@storybook/react-vite";
import React from "react";
import { Alert, AlertTitle, AlertDescription } from "./alert";

const meta = {
  title: "Primitives/Feedback State/Alert",
  component: Alert,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A shared feedback state alert primitive for displaying informational, success, " +
          "warning, and error messages. Uses CVA for variant composition. " +
          "Supports optional icon positioning, title, and description.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["default", "info", "success", "warning", "destructive"],
      description: "Visual variant indicating the feedback type",
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default neutral alert. */
export const Default: Story = {
  render: () => (
    <Alert className="w-96">
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components to your app using the CLI.
      </AlertDescription>
    </Alert>
  ),
};

/** Informational alert using the primary color. */
export const Info: Story = {
  render: () => (
    <Alert variant="info" className="w-96">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>
        This action will update your preferences across all devices.
      </AlertDescription>
    </Alert>
  ),
};

/** Success alert for positive outcomes. */
export const Success: Story = {
  render: () => (
    <Alert variant="success" className="w-96">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <AlertTitle>Success</AlertTitle>
      <AlertDescription>
        Your changes have been saved successfully.
      </AlertDescription>
    </Alert>
  ),
};

/** Warning alert for caution states. */
export const Warning: Story = {
  render: () => (
    <Alert variant="warning" className="w-96">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription>
        This action may have unintended consequences. Please review before proceeding.
      </AlertDescription>
    </Alert>
  ),
};

/** Destructive/error alert for failure states. */
export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive" className="w-96">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
      </svg>
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        The operation failed. Please try again or contact support.
      </AlertDescription>
    </Alert>
  ),
};

/** All variants displayed together for comparison. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-4">
      <Alert>
        <AlertTitle>Default</AlertTitle>
        <AlertDescription>Neutral feedback state.</AlertDescription>
      </Alert>
      <Alert variant="info">
        <AlertTitle>Info</AlertTitle>
        <AlertDescription>Informational message.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>Positive outcome.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Caution needed.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong.</AlertDescription>
      </Alert>
    </div>
  ),
};
