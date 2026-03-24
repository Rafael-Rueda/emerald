import type { BlockNode, DocumentContent, ListItem, TabsItem, TextNode } from "@emerald/contracts";

const escapeHtml = (value: string): string =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const renderTextNodes = (nodes: TextNode[]): string => nodes.map((node) => escapeHtml(node.text)).join("");

const plainTextFromListItems = (items: ListItem[]): string =>
    items
        .map((item) => normalizeWhitespace(item.children.map((node) => node.text).join(" ")))
        .filter(Boolean)
        .join(" ");

const plainTextFromTabsItems = (items: TabsItem[]): string =>
    items
        .map((item) => `${item.label} ${plainTextFromBlocks(item.children)}`)
        .map(normalizeWhitespace)
        .filter(Boolean)
        .join(" ");

const plainTextFromBlock = (block: BlockNode): string => {
    switch (block.type) {
        case "heading":
        case "paragraph":
            return normalizeWhitespace(block.children.map((node) => node.text).join(" "));
        case "ordered_list":
        case "unordered_list":
            return plainTextFromListItems(block.items);
        case "callout":
            return plainTextFromBlocks(block.children);
        case "code_block":
            return normalizeWhitespace(block.code);
        case "image":
            return normalizeWhitespace(`${block.alt} ${block.caption}`);
        case "table":
            return normalizeWhitespace([...block.columns, ...block.rows.flat()].join(" "));
        case "tabs":
            return plainTextFromTabsItems(block.items);
        default:
            return "";
    }
};

const renderBlock = (block: BlockNode): string => {
    switch (block.type) {
        case "heading":
            return `<h${block.level} id="${escapeHtml(block.id)}">${renderTextNodes(block.children)}</h${block.level}>`;
        case "paragraph":
            return `<p>${renderTextNodes(block.children)}</p>`;
        case "ordered_list":
            return `<ol>${block.items.map((item) => `<li>${renderTextNodes(item.children)}</li>`).join("")}</ol>`;
        case "unordered_list":
            return `<ul>${block.items.map((item) => `<li>${renderTextNodes(item.children)}</li>`).join("")}</ul>`;
        case "callout":
            return `<div data-callout-tone="${escapeHtml(block.tone)}">${block.children.map(renderBlock).join("")}</div>`;
        case "code_block":
            return `<pre><code class="language-${escapeHtml(block.language)}">${escapeHtml(block.code)}</code></pre>`;
        case "image":
            return `<figure><img src="${escapeHtml(block.assetId)}" data-asset-id="${escapeHtml(block.assetId)}" alt="${escapeHtml(block.alt)}" /><figcaption>${escapeHtml(block.caption)}</figcaption></figure>`;
        case "table": {
            const header = `<thead><tr>${block.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>`;
            const body = `<tbody>${block.rows
                .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
                .join("")}</tbody>`;
            return `<table>${header}${body}</table>`;
        }
        case "tabs":
            return `<div data-tabs="true">${block.items
                .map(
                    (item) =>
                        `<section data-tab-label="${escapeHtml(item.label)}">${item.children.map(renderBlock).join("")}</section>`,
                )
                .join("")}</div>`;
        default:
            return "";
    }
};

const plainTextFromBlocks = (blocks: BlockNode[]): string =>
    normalizeWhitespace(
        blocks
            .map((block) => plainTextFromBlock(block))
            .filter(Boolean)
            .join(" "),
    );

export interface RenderedDocumentContent {
    renderedHtml: string;
    plainText: string;
}

export const renderDocumentContent = (content: DocumentContent): RenderedDocumentContent => ({
    renderedHtml: content.children.map(renderBlock).join(""),
    plainText: plainTextFromBlocks(content.children),
});
