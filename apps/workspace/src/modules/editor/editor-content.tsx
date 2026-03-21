"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { type JSONContent } from "@tiptap/core";
import {
  EditorContent as TiptapEditorContent,
  useEditor,
} from "@tiptap/react";
import { cn } from "@emerald/ui/lib/cn";
import { type CalloutTone } from "./extensions";
import { getEditorExtensions } from "./get-editor-extensions";
import { uploadWorkspaceEditorImageAsset } from "./infrastructure/editor-assets-api";

const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg"]);
const DEFAULT_MAX_FILE_SIZE_MB = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? "10");
const FALLBACK_UPLOAD_ENTITY_ID = "00000000-0000-4000-8000-000000000000";

export interface WorkspaceEditorUploadContext {
  entityType: string;
  entityId: string;
  field: string;
  maxFileSizeMb?: number;
}

export interface WorkspaceEditorContentProps {
  initialContent?: JSONContent;
  editable?: boolean;
  className?: string;
  onChange?: (json: JSONContent) => void;
  uploadContext?: WorkspaceEditorUploadContext;
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
  uploadContext,
}: WorkspaceEditorContentProps) {
  const [isImageUploadModalOpen, setIsImageUploadModalOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const resolvedUploadContext = useMemo(() => ({
    entityType: uploadContext?.entityType ?? "document",
    entityId: uploadContext?.entityId ?? FALLBACK_UPLOAD_ENTITY_ID,
    field: uploadContext?.field ?? "content-image",
    maxFileSizeMb: uploadContext?.maxFileSizeMb ?? DEFAULT_MAX_FILE_SIZE_MB,
  }), [uploadContext]);

  useEffect(() => {
    if (!selectedImageFile || typeof URL.createObjectURL !== "function") {
      setLocalPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImageFile);
    setLocalPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedImageFile]);

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

  function insertImage(url: string, caption: string) {
    editor
      ?.chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: {
          src: url,
          alt: caption,
          assetId: url,
          caption,
        },
      })
      .run();
  }

  function openImageUploadModal() {
    setUploadError(null);
    setUploadedImageUrl(null);
    setSelectedImageFile(null);
    setIsImageUploadModalOpen(true);
  }

  function closeImageUploadModal() {
    setIsImageUploadModalOpen(false);
    setUploadError(null);
    setUploadedImageUrl(null);
    setSelectedImageFile(null);
  }

  async function handleUploadImage() {
    if (!selectedImageFile) {
      setUploadError("Select a PNG or JPG image before uploading.");
      return;
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(selectedImageFile.type)) {
      setUploadError("Only PNG or JPG images are allowed.");
      return;
    }

    const maxBytes = resolvedUploadContext.maxFileSizeMb * 1024 * 1024;
    if (selectedImageFile.size > maxBytes) {
      setUploadError(`Image exceeds the ${resolvedUploadContext.maxFileSizeMb}MB size limit.`);
      return;
    }

    setIsUploadingImage(true);
    setUploadError(null);

    const result = await uploadWorkspaceEditorImageAsset({
      entityType: resolvedUploadContext.entityType,
      entityId: resolvedUploadContext.entityId,
      field: resolvedUploadContext.field,
      file: selectedImageFile,
    });

    setIsUploadingImage(false);

    if (result.status !== "success") {
      setUploadError(result.message);
      return;
    }

    setUploadedImageUrl(result.data.url);
    insertImage(result.data.url, selectedImageFile.name);
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
          onClick={openImageUploadModal}
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

      {isImageUploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="editor-image-upload-title"
          data-testid="editor-image-upload-modal"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-5 shadow-lg">
            <h3 id="editor-image-upload-title" className="text-lg font-semibold text-foreground">
              Upload image
            </h3>

            <div className="mt-4 space-y-3">
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setSelectedImageFile(nextFile);
                  setUploadedImageUrl(null);
                  setUploadError(null);
                }}
                data-testid="editor-image-upload-input"
              />

              <p className="text-xs text-muted-foreground">
                Supported files: PNG, JPG. Max size: {resolvedUploadContext.maxFileSizeMb}MB.
              </p>

              {(uploadedImageUrl || localPreviewUrl) && (
                <div className="space-y-2" data-testid="editor-image-upload-preview">
                  <Image
                    src={uploadedImageUrl ?? localPreviewUrl ?? ""}
                    alt="Uploaded preview"
                    width={320}
                    height={176}
                    unoptimized
                    className="max-h-44 rounded-md border border-border object-contain"
                    data-testid="editor-image-upload-thumbnail"
                  />
                  {uploadedImageUrl && (
                    <p className="text-xs text-emerald-600" data-testid="editor-image-upload-success">
                      Image uploaded and inserted into the editor.
                    </p>
                  )}
                </div>
              )}

              {uploadError && (
                <p className="text-sm text-destructive" data-testid="editor-image-upload-error">
                  {uploadError}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeImageUploadModal}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleUploadImage();
                  }}
                  disabled={isUploadingImage}
                  className="rounded-md border border-primary bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploadingImage ? "Uploading…" : "Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
