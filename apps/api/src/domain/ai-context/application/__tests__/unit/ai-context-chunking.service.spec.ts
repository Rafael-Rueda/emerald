import type { DocumentContent } from "@emerald/contracts";

import { AiContextService } from "../../ai-context.service";
import type { DocumentChunkRepository } from "../../repositories/document-chunk.repository";

import type { PrismaService } from "@/infra/database/prisma/prisma.service";

const makeRepository = (): jest.Mocked<DocumentChunkRepository> => ({
    deleteByDocumentId: jest.fn(),
    createMany: jest.fn(),
});

const makePrismaService = (): jest.Mocked<Pick<PrismaService, "document">> => ({
    document: {
        findUnique: jest.fn(),
    } as unknown as PrismaService["document"],
});

const makeVoyageClient = () => ({
    embed: jest.fn(),
});

describe("AiContextService.chunkDocument", () => {
    let sut: AiContextService;

    beforeEach(() => {
        sut = new AiContextService(makeRepository(), makePrismaService() as never, makeVoyageClient());
    });

    it("creates one chunk per heading section and aggregates following non-heading blocks", () => {
        const content: DocumentContent = {
            type: "doc",
            version: 1,
            children: [
                {
                    type: "heading",
                    level: 2,
                    id: "intro",
                    children: [{ type: "text", text: "Introduction" }],
                },
                {
                    type: "paragraph",
                    children: [{ type: "text", text: "Welcome to Emerald" }],
                },
                {
                    type: "unordered_list",
                    items: [
                        { children: [{ type: "text", text: "First bullet" }] },
                        { children: [{ type: "text", text: "Second bullet" }] },
                    ],
                },
                {
                    type: "heading",
                    level: 2,
                    id: "advanced",
                    children: [{ type: "text", text: "Advanced" }],
                },
                {
                    type: "code_block",
                    language: "ts",
                    code: "const x = 1;",
                },
                {
                    type: "paragraph",
                    children: [{ type: "text", text: "More details" }],
                },
            ],
        };

        const chunks = sut.chunkDocument(content);

        expect(chunks).toHaveLength(2);

        expect(chunks[0]).toEqual({
            sectionId: "intro",
            sectionTitle: "Introduction",
            content: "Welcome to Emerald First bullet Second bullet",
        });

        expect(chunks[1]).toEqual({
            sectionId: "advanced",
            sectionTitle: "Advanced",
            content: "const x = 1; More details",
        });
    });

    it("returns a single root chunk when there are no headings", () => {
        const content: DocumentContent = {
            type: "doc",
            version: 1,
            children: [
                {
                    type: "paragraph",
                    children: [{ type: "text", text: "Top level paragraph" }],
                },
                {
                    type: "ordered_list",
                    items: [{ children: [{ type: "text", text: "First item" }] }],
                },
                {
                    type: "code_block",
                    language: "ts",
                    code: "console.log('x')",
                },
            ],
        };

        const chunks = sut.chunkDocument(content);

        expect(chunks).toEqual([
            {
                sectionId: "root",
                sectionTitle: "Introduction",
                content: "Top level paragraph First item console.log('x')",
            },
        ]);
    });

    it("returns empty array for empty document children", () => {
        const content: DocumentContent = {
            type: "doc",
            version: 1,
            children: [],
        };

        expect(sut.chunkDocument(content)).toEqual([]);
    });

    it("extracts text from all supported block types", () => {
        const content: DocumentContent = {
            type: "doc",
            version: 1,
            children: [
                {
                    type: "heading",
                    level: 2,
                    id: "all-types",
                    children: [{ type: "text", text: "All Types" }],
                },
                {
                    type: "paragraph",
                    children: [{ type: "text", text: "Paragraph text" }],
                },
                {
                    type: "ordered_list",
                    items: [{ children: [{ type: "text", text: "Ordered item" }] }],
                },
                {
                    type: "unordered_list",
                    items: [{ children: [{ type: "text", text: "Unordered item" }] }],
                },
                {
                    type: "code_block",
                    language: "ts",
                    code: "let v = 1",
                },
                {
                    type: "callout",
                    tone: "info",
                    children: [
                        {
                            type: "paragraph",
                            children: [{ type: "text", text: "Callout paragraph" }],
                        },
                    ],
                },
                {
                    type: "image",
                    assetId: "asset-1",
                    alt: "Architecture diagram",
                    caption: "Ignored caption",
                },
                {
                    type: "table",
                    columns: ["Column A", "Column B"],
                    rows: [["Cell 1", "Cell 2"]],
                },
                {
                    type: "tabs",
                    items: [
                        {
                            label: "Tab One",
                            children: [
                                {
                                    type: "paragraph",
                                    children: [{ type: "text", text: "Tab body" }],
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        const [chunk] = sut.chunkDocument(content);

        expect(chunk.sectionId).toBe("all-types");
        expect(chunk.sectionTitle).toBe("All Types");
        expect(chunk.content).toContain("Paragraph text");
        expect(chunk.content).toContain("Ordered item");
        expect(chunk.content).toContain("Unordered item");
        expect(chunk.content).toContain("let v = 1");
        expect(chunk.content).toContain("Callout paragraph");
        expect(chunk.content).toContain("Architecture diagram");
        expect(chunk.content).toContain("Column A Column B Cell 1 Cell 2");
        expect(chunk.content).toContain("Tab One Tab body");
    });
});
