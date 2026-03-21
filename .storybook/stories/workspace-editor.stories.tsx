import type { Meta, StoryObj } from "@storybook/react-vite";
import React, { useMemo, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { EditorContent, toDocumentContent } from "../../apps/workspace/src/modules/editor";

const allBlocksContent: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2, id: "all-block-types" },
      content: [{ type: "text", text: "All supported blocks" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Paragraph block rendered in TipTap." }],
    },
    {
      type: "orderedList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Ordered item 1" }] }],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Ordered item 2" }] }],
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Bullet item" }] }],
        },
      ],
    },
    {
      type: "callout",
      attrs: { tone: "info" },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Callout with info tone" }],
        },
      ],
    },
    {
      type: "codeBlock",
      attrs: { language: "ts" },
      content: [{ type: "text", text: "console.log('code block')" }],
    },
    {
      type: "image",
      attrs: {
        src: "https://storage.googleapis.com/emerald-assets/sample-image.png",
        assetId: "asset-sample-image",
        alt: "Sample image",
        caption: "Image block",
      },
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Name" }] }],
            },
            {
              type: "tableHeader",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Value" }] }],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Contracts" }] }],
            },
            {
              type: "tableCell",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Ready" }] }],
            },
          ],
        },
      ],
    },
    {
      type: "tabs",
      content: [
        {
          type: "tabItem",
          attrs: { label: "Overview" },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Tabs block first item" }],
            },
          ],
        },
        {
          type: "tabItem",
          attrs: { label: "Details" },
          content: [
            {
              type: "callout",
              attrs: { tone: "success" },
              content: [
                {
                  type: "codeBlock",
                  attrs: { language: "bash" },
                  content: [{ type: "text", text: "pnpm test -- --run" }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

function WorkspaceEditorStory() {
  const [editorJson, setEditorJson] = useState<JSONContent>(allBlocksContent);

  const mapped = useMemo(() => toDocumentContent(editorJson), [editorJson]);

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold text-foreground">Workspace TipTap Editor</h2>
      <p className="text-sm text-muted-foreground">
        This story preloads all supported block types and keeps a live JSON conversion preview.
      </p>

      <EditorContent initialContent={allBlocksContent} onChange={setEditorJson} />

      <div className="rounded-lg border border-border bg-card p-3">
        <h3 className="mb-2 text-sm font-semibold text-foreground">toDocumentContent(editor.getJSON())</h3>
        <pre className="max-h-72 overflow-auto rounded-md bg-muted p-2 text-xs text-foreground">
          {JSON.stringify(mapped, null, 2)}
        </pre>
      </div>
    </div>
  );
}

const meta: Meta<typeof WorkspaceEditorStory> = {
  title: "Workspace/Editor/TipTap",
  component: WorkspaceEditorStory,
};

export default meta;
type Story = StoryObj<typeof WorkspaceEditorStory>;

export const AllBlocks: Story = {};
