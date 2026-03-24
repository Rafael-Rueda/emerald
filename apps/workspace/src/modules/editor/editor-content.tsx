"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { type JSONContent } from "@tiptap/core";
import {
  EditorContent as TiptapEditorContent,
  useEditor,
  BubbleMenu,
} from "@tiptap/react";
import { cn } from "@emerald/ui/lib/cn";
import { type CalloutTone } from "./extensions";
import { getEditorExtensions, SUPPORTED_LANGUAGES } from "./get-editor-extensions";
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
      content: [],
    },
  ],
};

/* ── Toolbar button helpers ─────────────────────────────────── */

function ToolbarButton({
  active,
  onClick,
  children,
  title,
  className: extraClass,
  "data-testid": testId,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      data-testid={testId}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded px-2 text-xs font-medium transition-colors select-none",
        active
          ? "bg-primary/20 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        extraClass,
      )}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="mx-0.5 h-5 w-px bg-border" />;
}

/* ── Main component ─────────────────────────────────────────── */

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
  const [showBlockMenu, setShowBlockMenu] = useState(false);

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
    enableInputRules: false,
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getJSON());
    },
    editorProps: {
      attributes: {
        class: cn("outline-none", editable ? "min-h-[28rem] px-6 py-5" : "px-4 py-3"),
      },
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
            content: [{ type: "text", text: " " }],
          },
        ],
      })
      .run();
    setShowBlockMenu(false);
  }

  function insertCodeBlock() {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    if (hasSelection) {
      editor.chain().focus().toggleCodeBlock().run();
    } else {
      editor.chain().focus().setCodeBlock({ language: "ts" }).run();
    }
    setShowBlockMenu(false);
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
    setShowBlockMenu(false);
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
    <section className={cn("flex flex-col", className)}>
      {/* ── Sticky Toolbar ─────────────────────────────────── */}
      <div className="sticky top-0 z-10 rounded-t-lg border border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        {/* Primary row: text formatting + structure */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
          {/* Text formatting */}
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
            data-testid="editor-format-bold"
          >
            <span className="font-bold">B</span>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
            data-testid="editor-format-italic"
          >
            <span className="italic">I</span>
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Block type */}
          <ToolbarButton
            active={editor.isActive("paragraph") && !editor.isActive("heading")}
            onClick={() => editor.chain().focus().setParagraph().run()}
            title="Paragraph"
            data-testid="editor-insert-paragraph"
          >
            P
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
            data-testid="editor-insert-heading"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
            data-testid="editor-insert-heading-3"
          >
            H3
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Lists */}
          <ToolbarButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
            data-testid="editor-insert-unordered-list"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current"><circle cx="3" cy="4" r="1.2" fill="currentColor"/><line x1="6" y1="4" x2="14" y2="4" strokeWidth="1.5" strokeLinecap="round"/><circle cx="3" cy="8" r="1.2" fill="currentColor"/><line x1="6" y1="8" x2="14" y2="8" strokeWidth="1.5" strokeLinecap="round"/><circle cx="3" cy="12" r="1.2" fill="currentColor"/><line x1="6" y1="12" x2="14" y2="12" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Ordered list"
            data-testid="editor-insert-ordered-list"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current"><text x="1.5" y="5.5" fontSize="5" fill="currentColor" fontFamily="monospace">1.</text><line x1="6" y1="4" x2="14" y2="4" strokeWidth="1.5" strokeLinecap="round"/><text x="1.5" y="9.5" fontSize="5" fill="currentColor" fontFamily="monospace">2.</text><line x1="6" y1="8" x2="14" y2="8" strokeWidth="1.5" strokeLinecap="round"/><text x="1.5" y="13.5" fontSize="5" fill="currentColor" fontFamily="monospace">3.</text><line x1="6" y1="12" x2="14" y2="12" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Code */}
          <ToolbarButton
            active={editor.isActive("codeBlock")}
            onClick={insertCodeBlock}
            title="Code block"
            data-testid="editor-insert-code-block"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="5,3 1,8 5,13"/><polyline points="11,3 15,8 11,13"/><line x1="9" y1="2" x2="7" y2="14"/></svg>
          </ToolbarButton>

          {/* Language selector — visible when cursor is inside a code block */}
          {editable && editor.isActive("codeBlock") && (
            <select
              value={(editor.getAttributes("codeBlock").language as string) ?? "plaintext"}
              onChange={(e) => {
                editor.chain().focus().updateAttributes("codeBlock", { language: e.target.value }).run();
              }}
              className="h-8 rounded border border-border bg-background px-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              data-testid="editor-code-language-select"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          )}

          {/* Insert block dropdown */}
          <div className="relative">
            <ToolbarButton
              onClick={() => setShowBlockMenu(!showBlockMenu)}
              title="Insert block"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current" strokeWidth="1.5" strokeLinecap="round"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="stroke-current ml-0.5" strokeWidth="1.5" strokeLinecap="round"><polyline points="2,4 5,7 8,4"/></svg>
            </ToolbarButton>

            {showBlockMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowBlockMenu(false)} />
                <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-lg border border-border bg-popover p-1.5 shadow-lg">
                  <p className="px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Insert Block</p>
                  <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent" onClick={openImageUploadModal} data-testid="editor-insert-image">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current" strokeWidth="1.2"><rect x="1" y="2" width="12" height="10" rx="1.5"/><circle cx="4.5" cy="5.5" r="1.2"/><polyline points="1,11 4,7 7,9 10,5 13,9"/></svg></span>
                    Image
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent" onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); setShowBlockMenu(false); }} data-testid="editor-insert-table">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current" strokeWidth="1.2"><rect x="1" y="1" width="12" height="12" rx="1.5"/><line x1="1" y1="5" x2="13" y2="5"/><line x1="1" y1="9" x2="13" y2="9"/><line x1="5" y1="1" x2="5" y2="13"/><line x1="9" y1="1" x2="9" y2="13"/></svg></span>
                    Table
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent" onClick={() => { editor.chain().focus().insertTabs().run(); setShowBlockMenu(false); }} data-testid="editor-insert-tabs">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current" strokeWidth="1.2"><rect x="1" y="3" width="12" height="9" rx="1.5"/><rect x="1" y="1" width="4" height="3" rx="1"/><rect x="5.5" y="1" width="4" height="3" rx="1"/></svg></span>
                    Tabs
                  </button>

                  <div className="my-1 h-px bg-border" />
                  <p className="px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Callouts</p>

                  <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent" onClick={() => insertCallout("info")} data-testid="editor-insert-callout-info">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/20 text-blue-400 text-xs font-bold">i</span>
                    <span className="text-foreground">Info</span>
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent" onClick={() => insertCallout("warn")} data-testid="editor-insert-callout-warn">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-amber-500/20 text-amber-400 text-xs font-bold">!</span>
                    <span className="text-foreground">Warning</span>
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent" onClick={() => insertCallout("danger")} data-testid="editor-insert-callout-danger">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-red-500/20 text-red-400 text-xs font-bold">&#x2717;</span>
                    <span className="text-foreground">Danger</span>
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent" onClick={() => insertCallout("success")} data-testid="editor-insert-callout-success">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">&#x2713;</span>
                    <span className="text-foreground">Success</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Bubble Menu (inline formatting on text selection) ── */}
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 150 }}>
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-popover px-1 py-0.5 shadow-lg">
            <ToolbarButton
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <span className="font-bold">B</span>
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <span className="italic">I</span>
            </ToolbarButton>
            <ToolbarSeparator />
            <ToolbarButton
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("heading", { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              H3
            </ToolbarButton>
          </div>
        </BubbleMenu>
      )}

      {/* ── Image Upload Modal ────────────────────────────── */}
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

      {/* ── Editor Canvas ─────────────────────────────────── */}
      <div className="rounded-b-lg border border-t-0 border-border bg-card">
        <TiptapEditorContent
          editor={editor}
          className={cn(
            /* ── Base typography (no @tailwindcss/typography needed) ── */
            "text-foreground text-[0.9375rem] leading-relaxed",

            /* ── Headings ── */
            "[&_.tiptap_h1]:text-2xl [&_.tiptap_h1]:font-bold [&_.tiptap_h1]:mt-8 [&_.tiptap_h1]:mb-3 [&_.tiptap_h1]:leading-tight [&_.tiptap_h1]:text-foreground",
            "[&_.tiptap_h2]:text-xl [&_.tiptap_h2]:font-semibold [&_.tiptap_h2]:mt-7 [&_.tiptap_h2]:mb-2.5 [&_.tiptap_h2]:leading-snug [&_.tiptap_h2]:text-foreground",
            "[&_.tiptap_h3]:text-lg [&_.tiptap_h3]:font-semibold [&_.tiptap_h3]:mt-6 [&_.tiptap_h3]:mb-2 [&_.tiptap_h3]:leading-snug [&_.tiptap_h3]:text-foreground",
            "[&_.tiptap_h4]:text-base [&_.tiptap_h4]:font-semibold [&_.tiptap_h4]:mt-5 [&_.tiptap_h4]:mb-1.5 [&_.tiptap_h4]:text-foreground",

            /* ── Paragraphs ── */
            "[&_.tiptap_p]:my-2 [&_.tiptap_p]:leading-relaxed",
            "[&_.tiptap_p:first-child]:mt-0",
            "[&_.tiptap_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_.is-editor-empty:first-child::before]:float-left [&_.tiptap_.is-editor-empty:first-child::before]:h-0 [&_.tiptap_.is-editor-empty:first-child::before]:pointer-events-none",

            /* ── Lists ── */
            "[&_.tiptap_ul]:my-3 [&_.tiptap_ul]:pl-6 [&_.tiptap_ul]:list-disc",
            "[&_.tiptap_ol]:my-3 [&_.tiptap_ol]:pl-6 [&_.tiptap_ol]:list-decimal",
            "[&_.tiptap_li]:my-1 [&_.tiptap_li]:leading-relaxed",
            "[&_.tiptap_li_p]:my-0.5",

            /* ── Code blocks ── */
            "[&_.tiptap_pre]:my-4 [&_.tiptap_pre]:rounded-lg [&_.tiptap_pre]:bg-[hsl(var(--muted))] [&_.tiptap_pre]:p-4 [&_.tiptap_pre]:overflow-x-auto",
            "[&_.tiptap_pre_code]:text-sm [&_.tiptap_pre_code]:font-mono [&_.tiptap_pre_code]:text-foreground [&_.tiptap_pre_code]:bg-transparent [&_.tiptap_pre_code]:p-0",
            "[&_.tiptap_code]:rounded [&_.tiptap_code]:bg-muted [&_.tiptap_code]:px-1.5 [&_.tiptap_code]:py-0.5 [&_.tiptap_code]:text-sm [&_.tiptap_code]:font-mono [&_.tiptap_code]:text-primary",

            /* ── Blockquote ── */
            "[&_.tiptap_blockquote]:border-l-4 [&_.tiptap_blockquote]:border-border [&_.tiptap_blockquote]:pl-4 [&_.tiptap_blockquote]:my-4 [&_.tiptap_blockquote]:text-muted-foreground [&_.tiptap_blockquote]:italic",

            /* ── Horizontal rule ── */
            "[&_.tiptap_hr]:my-6 [&_.tiptap_hr]:border-border",

            /* ── Strong / em ── */
            "[&_.tiptap_strong]:font-bold",
            "[&_.tiptap_em]:italic",

            /* ── Callouts ── */
            "[&_.editor-callout]:rounded-lg [&_.editor-callout]:border-l-4 [&_.editor-callout]:px-4 [&_.editor-callout]:py-3 [&_.editor-callout]:my-4",
            "[&_.editor-callout[data-callout-tone='info']]:bg-blue-500/10 [&_.editor-callout[data-callout-tone='info']]:border-blue-500 [&_.editor-callout[data-callout-tone='info']]:text-blue-200",
            "[&_.editor-callout[data-callout-tone='warn']]:bg-amber-500/10 [&_.editor-callout[data-callout-tone='warn']]:border-amber-500 [&_.editor-callout[data-callout-tone='warn']]:text-amber-200",
            "[&_.editor-callout[data-callout-tone='danger']]:bg-red-500/10 [&_.editor-callout[data-callout-tone='danger']]:border-red-500 [&_.editor-callout[data-callout-tone='danger']]:text-red-200",
            "[&_.editor-callout[data-callout-tone='success']]:bg-emerald-500/10 [&_.editor-callout[data-callout-tone='success']]:border-emerald-500 [&_.editor-callout[data-callout-tone='success']]:text-emerald-200",
            "[&_.editor-callout_p]:my-1",

            /* ── Tables ── */
            "[&_.tiptap_table]:w-full [&_.tiptap_table]:border-collapse [&_.tiptap_table]:my-4 [&_.tiptap_table]:rounded-md [&_.tiptap_table]:overflow-hidden",
            "[&_.tiptap_th]:border [&_.tiptap_th]:border-border [&_.tiptap_th]:bg-muted [&_.tiptap_th]:px-3 [&_.tiptap_th]:py-2 [&_.tiptap_th]:text-left [&_.tiptap_th]:text-sm [&_.tiptap_th]:font-semibold",
            "[&_.tiptap_td]:border [&_.tiptap_td]:border-border [&_.tiptap_td]:px-3 [&_.tiptap_td]:py-2 [&_.tiptap_td]:text-sm",
            "[&_.tiptap_.selectedCell]:bg-primary/10",

            /* ── Images ── */
            "[&_.tiptap_img]:rounded-lg [&_.tiptap_img]:border [&_.tiptap_img]:border-border [&_.tiptap_img]:max-w-full [&_.tiptap_img]:h-auto [&_.tiptap_img]:my-4",

            /* ── Tabs ── */
            "[&_.editor-tabs]:my-4 [&_.editor-tabs]:rounded-lg [&_.editor-tabs]:border [&_.editor-tabs]:border-border [&_.editor-tabs]:overflow-hidden",
            "[&_.editor-tab-item]:border-t [&_.editor-tab-item]:border-border [&_.editor-tab-item]:p-4",
            "[&_.editor-tab-item::before]:content-[attr(data-tab-label)] [&_.editor-tab-item::before]:block [&_.editor-tab-item::before]:text-xs [&_.editor-tab-item::before]:font-semibold [&_.editor-tab-item::before]:uppercase [&_.editor-tab-item::before]:tracking-wide [&_.editor-tab-item::before]:text-muted-foreground [&_.editor-tab-item::before]:mb-2 [&_.editor-tab-item::before]:pb-1 [&_.editor-tab-item::before]:border-b [&_.editor-tab-item::before]:border-border",
          )}
        />
      </div>
    </section>
  );
}
