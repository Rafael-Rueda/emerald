import type { Meta, StoryObj } from "@storybook/react-vite";
import React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./dialog";
import { Button } from "./button";
import { TextInput } from "./text-input";

const meta = {
  title: "Primitives/Overlay/Dialog",
  component: Dialog,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "An accessible dialog/modal overlay primitive built on Radix UI. " +
          "Supports keyboard tabbing through focusable elements, Escape to dismiss, " +
          "and visible focus ring treatment. Traps focus inside the dialog when open.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Basic dialog with title, description, and action buttons. */
export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogDescription>
            Are you sure you want to proceed? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

/** Dialog with form content demonstrating keyboard tabbing through inputs. */
export const WithForm: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Edit Profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile. Press Tab to navigate between fields.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <TextInput label="Display Name" placeholder="Enter name" />
          <TextInput label="Email" placeholder="Enter email" type="email" />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

/**
 * Keyboard behavior demonstration.
 *
 * - **Tab**: Move focus between dialog elements
 * - **Shift+Tab**: Move focus backwards
 * - **Escape**: Dismiss the dialog
 * - Focus is trapped inside the dialog while open
 */
export const KeyboardBehavior: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open (try keyboard)</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Test</DialogTitle>
          <DialogDescription>
            Tab through the buttons below. Press Escape to close.
            Focus is trapped within this dialog.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Button variant="outline">First</Button>
          <Button variant="outline">Second</Button>
          <Button variant="outline">Third</Button>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Open the dialog and use Tab/Shift+Tab to navigate focus. " +
          "Press Escape to dismiss. Focus is trapped inside the dialog.",
      },
    },
  },
};
