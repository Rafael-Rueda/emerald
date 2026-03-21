import type { JSONContent } from "@tiptap/core";
import type { BlockNode, DocumentContent, TextNode } from "@emerald/contracts";

const CALLOUT_TONES = new Set(["info", "warn", "danger", "success"]);
type NormalizedCalloutTone = "info" | "warn" | "danger" | "success";

export function toDocumentContent(editorJson: JSONContent): DocumentContent {
  const headingIdUsage = new Map<string, number>();

  return {
    type: "doc",
    version: 1,
    children: convertBlocks(editorJson.content, headingIdUsage),
  };
}

function convertBlocks(
  nodes: JSONContent[] | undefined,
  headingIdUsage: Map<string, number>,
): BlockNode[] {
  if (!Array.isArray(nodes)) {
    return [];
  }

  return nodes
    .map((node) => toBlockNode(node, headingIdUsage))
    .filter((node): node is BlockNode => node !== null);
}

function toBlockNode(node: JSONContent, headingIdUsage: Map<string, number>): BlockNode | null {
  switch (node.type) {
    case "heading": {
      const children = toTextNodes(node.content);
      const level = normalizeHeadingLevel(node.attrs?.level);
      const id =
        typeof node.attrs?.id === "string" && node.attrs.id.trim().length > 0
          ? node.attrs.id
          : createHeadingId(children, headingIdUsage);

      return {
        type: "heading",
        id,
        level,
        children,
      };
    }

    case "paragraph": {
      return {
        type: "paragraph",
        children: toTextNodes(node.content),
      };
    }

    case "orderedList": {
      return {
        type: "ordered_list",
        items: toListItems(node.content),
      };
    }

    case "bulletList": {
      return {
        type: "unordered_list",
        items: toListItems(node.content),
      };
    }

    case "callout": {
      const rawTone = node.attrs?.tone;
      const tone: NormalizedCalloutTone =
        typeof rawTone === "string" && CALLOUT_TONES.has(rawTone)
          ? (rawTone as NormalizedCalloutTone)
          : "info";

      return {
        type: "callout",
        tone,
        children: convertBlocks(node.content, headingIdUsage),
      };
    }

    case "codeBlock": {
      return {
        type: "code_block",
        language:
          typeof node.attrs?.language === "string" && node.attrs.language.length > 0
            ? node.attrs.language
            : "plaintext",
        code: toTextValue(node.content),
      };
    }

    case "image": {
      const source = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      const assetId =
        typeof node.attrs?.assetId === "string" && node.attrs.assetId.length > 0
          ? node.attrs.assetId
          : source;

      return {
        type: "image",
        assetId,
        alt: typeof node.attrs?.alt === "string" ? node.attrs.alt : "",
        caption:
          typeof node.attrs?.caption === "string"
            ? node.attrs.caption
            : typeof node.attrs?.title === "string"
              ? node.attrs.title
              : "",
      };
    }

    case "table": {
      const tableRows = toTableRows(node.content);
      const [columns = [], ...rows] = tableRows;

      return {
        type: "table",
        columns,
        rows,
      };
    }

    case "tabs": {
      const tabItems = Array.isArray(node.content) ? node.content.filter((item) => item.type === "tabItem") : [];

      return {
        type: "tabs",
        items: tabItems.map((item, index) => ({
          label:
            typeof item.attrs?.label === "string" && item.attrs.label.trim().length > 0
              ? item.attrs.label
              : `Tab ${index + 1}`,
          children: convertBlocks(item.content, headingIdUsage),
        })),
      };
    }

    default:
      return null;
  }
}

function normalizeHeadingLevel(level: unknown): 1 | 2 | 3 | 4 {
  if (level === 1 || level === 2 || level === 3 || level === 4) {
    return level;
  }

  return 2;
}

function createHeadingId(children: TextNode[], headingIdUsage: Map<string, number>): string {
  const headingText = children.map((child) => child.text).join(" ");
  const normalized = headingText
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "heading";

  const nextCount = (headingIdUsage.get(normalized) ?? 0) + 1;
  headingIdUsage.set(normalized, nextCount);

  return nextCount === 1 ? normalized : `${normalized}-${nextCount}`;
}

function toListItems(nodes: JSONContent[] | undefined): { children: TextNode[] }[] {
  if (!Array.isArray(nodes)) {
    return [];
  }

  return nodes.map((node) => ({
    children: toTextNodes(node.content),
  }));
}

function toTextNodes(nodes: JSONContent[] | undefined): TextNode[] {
  const collected: TextNode[] = [];

  if (!Array.isArray(nodes)) {
    return collected;
  }

  for (const node of nodes) {
    if (node.type === "text" && typeof node.text === "string") {
      collected.push({ type: "text", text: node.text });
      continue;
    }

    if (node.type === "hardBreak") {
      collected.push({ type: "text", text: "\n" });
      continue;
    }

    if (Array.isArray(node.content)) {
      collected.push(...toTextNodes(node.content));
    }
  }

  return collected;
}

function toTextValue(nodes: JSONContent[] | undefined): string {
  return toTextNodes(nodes)
    .map((node) => node.text)
    .join("");
}

function toTableRows(nodes: JSONContent[] | undefined): string[][] {
  if (!Array.isArray(nodes)) {
    return [];
  }

  return nodes
    .filter((node) => node.type === "tableRow")
    .map((row) => {
      if (!Array.isArray(row.content)) {
        return [];
      }

      return row.content
        .filter((cell) => cell.type === "tableCell" || cell.type === "tableHeader")
        .map((cell) => toTextValue(cell.content));
    });
}
