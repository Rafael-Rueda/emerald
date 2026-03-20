import type { Meta, StoryObj } from "@storybook/react-vite";
import React, { useEffect, useState } from "react";
import { withMsw } from "@emerald/mocks/storybook";
import { DocumentResponseSchema } from "@emerald/contracts";

/**
 * Demo component that fetches a document from the MSW-backed API.
 * This story proves the Storybook MSW integration works end-to-end.
 */
function MswDocumentDemo() {
  const [state, setState] = useState<{
    status: "idle" | "loading" | "success" | "error" | "schema-error";
    title?: string;
    body?: string;
    error?: string;
  }>({ status: "idle" });

  useEffect(() => {
    setState({ status: "loading" });

    fetch("/api/docs/guides/v1/getting-started")
      .then(async (res) => {
        if (!res.ok) {
          setState({ status: "error", error: `HTTP ${res.status}` });
          return;
        }
        const data = await res.json();
        const parsed = DocumentResponseSchema.safeParse(data);
        if (!parsed.success) {
          setState({
            status: "schema-error",
            error: "Response failed schema validation",
          });
          return;
        }
        setState({
          status: "success",
          title: parsed.data.document.title,
          body: parsed.data.document.body,
        });
      })
      .catch((err) => {
        setState({ status: "error", error: String(err) });
      });
  }, []);

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold text-foreground">
        MSW Integration Demo
      </h2>

      {state.status === "loading" && (
        <div
          role="status"
          className="rounded-md border border-border bg-muted p-4 text-muted-foreground"
        >
          Loading document…
        </div>
      )}

      {state.status === "success" && (
        <div className="rounded-md border border-border bg-surface p-4">
          <h3 className="text-base font-medium text-foreground">
            {state.title}
          </h3>
          <div
            className="mt-2 text-sm text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: state.body ?? "" }}
          />
        </div>
      )}

      {state.status === "error" && (
        <div
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 p-4 text-destructive"
        >
          Error: {state.error}
        </div>
      )}

      {state.status === "schema-error" && (
        <div
          role="alert"
          className="rounded-md border border-warning bg-warning/10 p-4 text-warning-foreground"
        >
          Schema Error: {state.error}
        </div>
      )}
    </div>
  );
}

const meta: Meta<typeof MswDocumentDemo> = {
  title: "Integrations/MSW Demo",
  component: MswDocumentDemo,
  parameters: {
    docs: {
      description: {
        component:
          "Demonstrates that Storybook stories can opt into MSW-backed mocked data. " +
          "This story fetches a document from the mocked API and renders the result.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MswDocumentDemo>;

/**
 * Success scenario: MSW returns a valid document fixture.
 */
export const Success: Story = {
  decorators: [withMsw({ document: "success" })],
};

/**
 * Error scenario: MSW returns a 500 server error.
 */
export const ServerError: Story = {
  decorators: [withMsw({ document: "error" })],
};

/**
 * Malformed scenario: MSW returns data that fails Zod validation.
 */
export const MalformedPayload: Story = {
  decorators: [withMsw({ document: "malformed" })],
};
