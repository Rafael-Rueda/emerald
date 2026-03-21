import { act, renderHook } from "@testing-library/react";
import { DocumentContentSchema } from "@emerald/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { useDocumentAutosave } from "./use-document-autosave";

function createParagraph(text: string): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

describe("useDocumentAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces rapid updates into a single save request", async () => {
    const saveRevision = vi
      .fn()
      .mockResolvedValue({ status: "success" as const });

    const { rerender } = renderHook(
      ({ editorJson }) =>
        useDocumentAutosave({
          documentId: "doc-1",
          editorJson,
          saveRevision,
        }),
      {
        initialProps: {
          editorJson: createParagraph("a"),
        },
      },
    );

    for (let index = 0; index < 10; index += 1) {
      rerender({ editorJson: createParagraph(`typing-${index}`) });
    }

    await act(async () => {
      vi.advanceTimersByTime(1_999);
      await Promise.resolve();
    });

    expect(saveRevision).toHaveBeenCalledTimes(0);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(saveRevision).toHaveBeenCalledTimes(1);
  });

  it("maps TipTap JSON via toDocumentContent and validates DocumentContentSchema before save", async () => {
    const saveRevision = vi
      .fn()
      .mockResolvedValue({ status: "success" as const });

    const { rerender } = renderHook(
      ({ editorJson }) =>
        useDocumentAutosave({
          documentId: "doc-2",
          editorJson,
          saveRevision,
        }),
      {
        initialProps: {
          editorJson: {
            type: "doc",
            content: [
              {
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "Heading" }],
              },
            ],
          } satisfies JSONContent,
        },
      },
    );

    rerender({
      editorJson: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Updated heading" }],
          },
        ],
      },
    });

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(saveRevision).toHaveBeenCalledTimes(1);

    const [{ content_json }] = saveRevision.mock.calls[0] as [{ content_json: unknown }];
    expect(DocumentContentSchema.safeParse(content_json).success).toBe(true);
  });
});
