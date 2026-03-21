import type { DocumentContent } from "@emerald/contracts";

import { renderDocumentContent } from "../../utils/document-content-renderer";

describe("document-content-renderer", () => {
    it("renders HTML and plain text for nested content", () => {
        const content: DocumentContent = {
            type: "doc",
            version: 1,
            children: [
                {
                    type: "heading",
                    level: 2,
                    id: "getting-started",
                    children: [{ type: "text", text: "Getting Started" }],
                },
                {
                    type: "callout",
                    tone: "info",
                    children: [
                        {
                            type: "paragraph",
                            children: [{ type: "text", text: "Welcome to Emerald" }],
                        },
                    ],
                },
                {
                    type: "tabs",
                    items: [
                        {
                            label: "REST",
                            children: [
                                {
                                    type: "code_block",
                                    language: "bash",
                                    code: "curl /api/public/search?q=emerald",
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        const result = renderDocumentContent(content);

        expect(result.renderedHtml).toContain('<h2 id="getting-started">Getting Started</h2>');
        expect(result.renderedHtml).toContain('<div data-callout-tone="info">');
        expect(result.renderedHtml).toContain('<code class="language-bash">curl /api/public/search?q=emerald</code>');
        expect(result.plainText).toContain("Getting Started");
        expect(result.plainText).toContain("Welcome to Emerald");
        expect(result.plainText).toContain("curl /api/public/search?q=emerald");
    });

    it("escapes dangerous HTML values", () => {
        const content: DocumentContent = {
            type: "doc",
            version: 1,
            children: [
                {
                    type: "paragraph",
                    children: [{ type: "text", text: "<script>alert('xss')</script>" }],
                },
            ],
        };

        const result = renderDocumentContent(content);

        expect(result.renderedHtml).toContain("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
        expect(result.renderedHtml).not.toContain("<script>");
    });
});
