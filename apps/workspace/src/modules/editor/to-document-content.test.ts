import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { DocumentContentSchema } from "@emerald/contracts";
import { toDocumentContent } from "./to-document-content";

describe("toDocumentContent", () => {
  it("maps all supported TipTap blocks to DocumentContentSchema", () => {
    const editorJson: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2, id: "intro" },
          content: [{ type: "text", text: "Introduction" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Welcome to Emerald." }],
        },
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First step" }],
                },
              ],
            },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Bullet item" }],
                },
              ],
            },
          ],
        },
        {
          type: "callout",
          attrs: { tone: "warn" },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Check this warning" }],
            },
          ],
        },
        {
          type: "codeBlock",
          attrs: { language: "ts" },
          content: [{ type: "text", text: "console.log('hi')" }],
        },
        {
          type: "image",
          attrs: {
            src: "https://storage.googleapis.com/emerald-assets/diagram.png",
            assetId: "asset-1",
            alt: "Architecture diagram",
            caption: "Figure 1",
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
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Feature" }],
                    },
                  ],
                },
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Status" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Contracts" }],
                    },
                  ],
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Done" }],
                    },
                  ],
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
                  content: [{ type: "text", text: "Overview content" }],
                },
              ],
            },
            {
              type: "tabItem",
              attrs: { label: "Details" },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Detailed content" }],
                },
              ],
            },
          ],
        },
      ],
    };

    const mapped = toDocumentContent(editorJson);
    const parsed = DocumentContentSchema.safeParse(mapped);

    expect(parsed.success).toBe(true);
    expect(mapped.children.map((block) => block.type)).toEqual([
      "heading",
      "paragraph",
      "ordered_list",
      "unordered_list",
      "callout",
      "code_block",
      "image",
      "table",
      "tabs",
    ]);
  });

  it("normalizes all callout tones", () => {
    const tones = ["info", "warn", "danger", "success"] as const;

    for (const tone of tones) {
      const mapped = toDocumentContent({
        type: "doc",
        content: [
          {
            type: "callout",
            attrs: { tone },
            content: [{ type: "paragraph", content: [{ type: "text", text: tone }] }],
          },
        ],
      });

      expect(mapped.children[0]).toMatchObject({ type: "callout", tone });
      expect(DocumentContentSchema.safeParse(mapped).success).toBe(true);
    }
  });

  it("creates heading ids when missing and handles duplicates", () => {
    const mapped = toDocumentContent({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Hello World" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Hello World" }],
        },
      ],
    });

    const [first, second] = mapped.children;

    expect(first).toMatchObject({ type: "heading", id: "hello-world" });
    expect(second).toMatchObject({ type: "heading", id: "hello-world-2" });
  });

  it("maps deeply nested tabs > callout > code_block", () => {
    const mapped = toDocumentContent({
      type: "doc",
      content: [
        {
          type: "tabs",
          content: [
            {
              type: "tabItem",
              attrs: { label: "Advanced" },
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
    });

    expect(DocumentContentSchema.safeParse(mapped).success).toBe(true);
    expect(mapped.children[0]).toMatchObject({
      type: "tabs",
      items: [
        {
          label: "Advanced",
          children: [
            {
              type: "callout",
              tone: "success",
              children: [
                {
                  type: "code_block",
                  language: "bash",
                  code: "pnpm test -- --run",
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("uses image src as assetId fallback", () => {
    const mapped = toDocumentContent({
      type: "doc",
      content: [
        {
          type: "image",
          attrs: {
            src: "https://storage.googleapis.com/emerald-assets/from-src.png",
            alt: "From source",
          },
        },
      ],
    });

    expect(mapped.children[0]).toMatchObject({
      type: "image",
      assetId: "https://storage.googleapis.com/emerald-assets/from-src.png",
      alt: "From source",
      caption: "",
    });
  });

  it("maps table first row to columns and remaining rows to rows", () => {
    const mapped = toDocumentContent({
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Col A" }] }],
                },
                {
                  type: "tableHeader",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Col B" }] }],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "A1" }] }],
                },
                {
                  type: "tableCell",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "B1" }] }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(mapped.children[0]).toEqual({
      type: "table",
      columns: ["Col A", "Col B"],
      rows: [["A1", "B1"]],
    });
  });

  it("filters unsupported nodes instead of emitting unknown block types", () => {
    const mapped = toDocumentContent({
      type: "doc",
      content: [
        { type: "horizontalRule" },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Keep me" }],
        },
      ],
    });

    expect(mapped.children).toEqual([
      {
        type: "paragraph",
        children: [{ type: "text", text: "Keep me" }],
      },
    ]);
    expect(DocumentContentSchema.safeParse(mapped).success).toBe(true);
  });
});
