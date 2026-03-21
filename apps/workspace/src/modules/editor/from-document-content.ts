import type { BlockNode, DocumentContent, TextNode } from "@emerald/contracts";
import type { JSONContent } from "@tiptap/core";

const EMPTY_PARAGRAPH: JSONContent = {
  type: "paragraph",
};

export function fromDocumentContent(content: DocumentContent | null): JSONContent {
  if (!content) {
    return {
      type: "doc",
      content: [EMPTY_PARAGRAPH],
    };
  }

  const tiptapContent = content.children.map(toJsonBlock);

  return {
    type: "doc",
    content: tiptapContent.length > 0 ? tiptapContent : [EMPTY_PARAGRAPH],
  };
}

function toJsonBlock(block: BlockNode): JSONContent {
  switch (block.type) {
    case "heading":
      return {
        type: "heading",
        attrs: {
          level: block.level,
          id: block.id,
        },
        content: toJsonTextNodes(block.children),
      };

    case "paragraph":
      return {
        type: "paragraph",
        content: toJsonTextNodes(block.children),
      };

    case "ordered_list":
      return {
        type: "orderedList",
        content: block.items.map((item) => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: toJsonTextNodes(item.children),
            },
          ],
        })),
      };

    case "unordered_list":
      return {
        type: "bulletList",
        content: block.items.map((item) => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: toJsonTextNodes(item.children),
            },
          ],
        })),
      };

    case "callout":
      return {
        type: "callout",
        attrs: {
          tone: block.tone,
        },
        content: block.children.map(toJsonBlock),
      };

    case "code_block":
      return {
        type: "codeBlock",
        attrs: {
          language: block.language,
        },
        content: [{ type: "text", text: block.code }],
      };

    case "image":
      return {
        type: "image",
        attrs: {
          src: block.assetId,
          assetId: block.assetId,
          alt: block.alt,
          caption: block.caption,
        },
      };

    case "table": {
      const headerRow: JSONContent = {
        type: "tableRow",
        content: block.columns.map((column) => ({
          type: "tableHeader",
          content: [{ type: "paragraph", content: [{ type: "text", text: column }] }],
        })),
      };

      const bodyRows = block.rows.map((row) => ({
        type: "tableRow",
        content: row.map((cellValue) => ({
          type: "tableCell",
          content: [{ type: "paragraph", content: [{ type: "text", text: cellValue }] }],
        })),
      }));

      return {
        type: "table",
        content: [headerRow, ...bodyRows],
      };
    }

    case "tabs":
      return {
        type: "tabs",
        content: block.items.map((item) => ({
          type: "tabItem",
          attrs: {
            label: item.label,
          },
          content: item.children.map(toJsonBlock),
        })),
      };
  }
}

function toJsonTextNodes(nodes: TextNode[]): JSONContent[] {
  if (nodes.length === 0) {
    return [];
  }

  return nodes.map((node) => ({
    type: "text",
    text: node.text,
  }));
}
