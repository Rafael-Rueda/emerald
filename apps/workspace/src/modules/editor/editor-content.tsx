"use client";

import React from "react";
import { type JSONContent } from "@tiptap/core";
import {
  EditorContent as TiptapEditorContent,
  useEditor,
} from "@tiptap/react";
import { cn } from "@emerald/ui/lib/cn";
import { type CalloutTone } from "./extensions";
import { getEditorExtensions } from "./get-editor-extensions";

export interface WorkspaceEditorContentProps {
  initialContent?: JSONContent;
  editable?: boolean;
  className?: string;
  onChange?: (json: JSONContent) => void;
}

const DEFAULT_EDITOR_CONTENT: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Start writing your document..." }],
    },
  ],
};

export function EditorContent({
  initialContent,
  editable = true,
  className,
  onChange,
}: WorkspaceEditorContentProps) {
  const editor = useEditor({
    extensions: getEditorExtensions(),
    content: initialContent ?? DEFAULT_EDITOR_CONTENT,
    editable,
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getJSON());
    },
  });

  function insertCallout(tone: CalloutTone) {
    editor
      ?.chain()
      .focus()
      .insertContent({
        type: "callout",
        attrs: { tone },
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: `${tone.toUpperCase()} callout` }],
          },
        ],
      })
      .run();
  }

  function insertCodeBlock() {
    editor
      ?.chain()
      .focus()
      .insertContent({
        type: "codeBlock",
        attrs: { language: "ts" },
        content: [{ type: "text", text: "console.log('Hello from TipTap');" }],
      })
      .run();
  }

  function insertImage() {
    editor
      ?.chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: {
          src: "https://storage.googleapis.com/emerald-assets/sample-image.png",
          alt: "Sample editor image",
          assetId: "asset-sample-image",
          caption: "Sample image inserted from editor toolbar",
        },
      })
      .run();
  }

  if (!editor) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground",
          className,
        )}
      >
        Loading editor…
      </div>
    );
  }

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-3">
        <button
          type="button"
          data-testid="editor-insert-heading"
          className="rounded-md border border-border px-2 py-1 text-sm hover:bg-accent"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertContent({
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "Inserted heading" }],
              })
              .run()
          }
        >
          Heading
        </button>
        <button
          type="button"
          data-testid="editor-insert-paragraph"
          className="rounded-md border border-border px-2 py-1 text-sm hover:bg-accent"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertContent({
                type: "paragraph",
                content: [{ type: "text", text: "Inserted paragraph" }],
              })
              .run()
          }
        >
          Paragraph
        </button>
        <button
          type="button"
          data-testid="editor-insert-ordered-list"
          className="rounded-md border border-border px-2 py-1 text-sm hover:bg-accent"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Ordered list
        </button>
        <button
          type="button"
          data-testid="editor-insert-unordered-list"
          className="rounded-md border border-border px-2 py-1 text-sm hover:bg-accent"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Unordered list
        </button>
        <button
          type="button"
          data-testid="editor-insert-callout-info"
          className="rounded-md border border-border px-2 py-1 text-sm hover:bg-accent"
          onClick={() => insertCallout("info")}
        >
          Callout info
        </button>
        <button
          type="button"
          data-testid="editor-insert-callout-warn"
          className="rounded-md border border-border px-2 py-1 text-sm hover:bg-accent"
          onClick={() => insertCallout("warn")}
        >
          Callout warn
        </button>
        <button
          type="button"
          data-testid="editor-insert-callout-danger"
          className="rounded-md border border-border px-2 py-1 text-sm hover:bg-accent"
          onClick={() => insertCallout("danger")}
        >
          Callout danger
        </button>
        <button
          type="button"
          data-testid="editor-insert-callout-success"
          className="rounded-md border border-border px-2 py-1 text-sm hover:bg-accent"
          onClick={() => insertCallout("success")}
        >
          Callout success
        </button>
        <button
          type="button"
          data-testid="editor-insert-code-block"
          className="rounded-md border border-border px-2 py-1 text-sm hover:bg-accent"
          onClick={insertCodeBlock}
        >
          Code block
        </button>
        <button
          type="button"
          data-testid="editor-insert-image"
          className="rounded-md border border-border px-2 py-1 text-sm hover:bg-accent"
          onClick={insertImage}
        >
          Image
        </button>
        <button
          type="button"
          data-testid="editor-insert-table"
          className="rounded-md border border-border px-2 py-1 text-sm hover:bg-accent"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()}
        >
          Table
        </button>
        <button
          type="button"
          data-testid="editor-insert-tabs"
          className="rounded-md border border-border px-2 py-1 text-sm hover:bg-accent"
          onClick={() => editor.chain().focus().insertTabs().run()}
        >
          Tabs
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <TiptapEditorContent
          editor={editor}
          className={cn(
            "prose prose-sm max-w-none text-foreground",
            "min-h-64 rounded-md border border-dashed border-border p-3",
            "focus-within:border-primary focus-within:outline-none",
          )}
        />
      </div>
    </section>
  );
}
