import { AiContextResponseSchema } from "@emerald/contracts";
import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { DocumentStatus, ReleaseVersionStatus } from "@prisma/client";
import * as pgvector from "pgvector";
import request from "supertest";

import { VOYAGE_AI_EMBEDDING_CLIENT } from "@/domain/ai-context/application/ai-context.service";
import { PublicModule } from "@/http/public/public.module";
import { PrismaService } from "@/infra/database/prisma/prisma.service";

const makeVector = (x: number, y = 0): number[] => [x, y, ...Array.from({ length: 510 }, () => 0)];

describe("AiContextController (e2e)", () => {
    let app: INestApplication;
    let prismaService: PrismaService;

    const uniqueSuffix = `${Date.now()}`;
    const targetSpaceKey = `semantic-space-${uniqueSuffix}`;
    const otherSpaceKey = `semantic-other-space-${uniqueSuffix}`;
    const targetVersionKey = "v1";
    const otherVersionKey = "v2";
    const queryText = "semantic test query";

    let targetVersionId: string;

    const createPublishedDocument = async (
        spaceId: string,
        spaceKey: string,
        releaseVersionId: string,
        releaseVersionKey: string,
        index: number,
    ) => {
        const document = await prismaService.document.create({
            data: {
                spaceId,
                releaseVersionId,
                title: `Semantic Doc ${index}`,
                slug: `semantic-doc-${index}-${uniqueSuffix}`,
                status: DocumentStatus.PUBLISHED,
                createdBy: "semantic-e2e",
                updatedBy: "semantic-e2e",
            },
        });

        const revision = await prismaService.documentRevision.create({
            data: {
                documentId: document.id,
                revisionNumber: 1,
                contentJson: {
                    type: "doc",
                    version: 1,
                    children: [
                        {
                            type: "heading",
                            id: `section-${index}`,
                            level: 2,
                            children: [{ type: "text", text: `Section ${index}` }],
                        },
                        {
                            type: "paragraph",
                            children: [{ type: "text", text: `Content for document ${index}` }],
                        },
                    ],
                },
                plainText: `Content for document ${index}`,
                renderedHtml: `<h2>Section ${index}</h2><p>Content for document ${index}</p>`,
                createdBy: "semantic-e2e",
            },
        });

        await prismaService.document.update({
            where: { id: document.id },
            data: { currentRevisionId: revision.id },
        });

        await prismaService.navigationNode.create({
            data: {
                spaceId,
                releaseVersionId,
                parentId: null,
                documentId: document.id,
                label: `Navigation ${index}`,
                slug: `navigation-${index}-${spaceKey}-${releaseVersionKey}`,
                order: index,
                nodeType: "DOCUMENT",
                externalUrl: null,
            },
        });

        return document;
    };

    const insertChunk = async (params: {
        chunkId: string;
        documentId: string;
        spaceId: string;
        releaseVersionId: string;
        sectionId: string;
        sectionTitle: string;
        content: string;
        embedding: number[];
    }) => {
        const serializedVector = pgvector.toSql(params.embedding);

        await prismaService.$executeRaw`
            INSERT INTO "document_chunks" (
                "id",
                "document_id",
                "space_id",
                "release_version_id",
                "section_id",
                "section_title",
                "content",
                "embedding"
            ) VALUES (
                ${params.chunkId},
                ${params.documentId},
                ${params.spaceId},
                ${params.releaseVersionId},
                ${params.sectionId},
                ${params.sectionTitle},
                ${params.content},
                ${serializedVector}::vector
            )
        `;
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [ConfigModule.forRoot({ isGlobal: true }), PublicModule],
        })
            .overrideProvider(VOYAGE_AI_EMBEDDING_CLIENT)
            .useValue({
                embed: jest.fn().mockResolvedValue({
                    data: [{ embedding: makeVector(1, 0) }],
                }),
            })
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prismaService = app.get(PrismaService);

        await prismaService.documentChunk.deleteMany({});

        const targetSpace = await prismaService.space.create({
            data: {
                key: targetSpaceKey,
                name: "Semantic Search Space",
                description: "Target space",
            },
        });

        const otherSpace = await prismaService.space.create({
            data: {
                key: otherSpaceKey,
                name: "Semantic Search Other Space",
                description: "Other space",
            },
        });

        const targetVersion = await prismaService.releaseVersion.create({
            data: {
                spaceId: targetSpace.id,
                key: targetVersionKey,
                label: "Version 1",
                status: ReleaseVersionStatus.PUBLISHED,
                isDefault: true,
                publishedAt: new Date(),
            },
        });

        const otherVersion = await prismaService.releaseVersion.create({
            data: {
                spaceId: targetSpace.id,
                key: otherVersionKey,
                label: "Version 2",
                status: ReleaseVersionStatus.PUBLISHED,
                isDefault: false,
                publishedAt: new Date(),
            },
        });

        const otherSpaceVersion = await prismaService.releaseVersion.create({
            data: {
                spaceId: otherSpace.id,
                key: targetVersionKey,
                label: "Version 1",
                status: ReleaseVersionStatus.PUBLISHED,
                isDefault: true,
                publishedAt: new Date(),
            },
        });

        targetVersionId = targetVersion.id;
        for (let index = 0; index < 12; index += 1) {
            const document = await createPublishedDocument(
                targetSpace.id,
                targetSpaceKey,
                targetVersion.id,
                targetVersionKey,
                index,
            );

            await insertChunk({
                chunkId: `chunk-target-${index}-${uniqueSuffix}`,
                documentId: document.id,
                spaceId: targetSpace.id,
                releaseVersionId: targetVersion.id,
                sectionId: `section-${index}`,
                sectionTitle: `Section ${index}`,
                content: `Chunk content ${index}`,
                embedding: makeVector(1 - index * 0.05, index * 0.01),
            });
        }

        const otherSpaceDocument = await createPublishedDocument(
            otherSpace.id,
            otherSpaceKey,
            otherSpaceVersion.id,
            targetVersionKey,
            100,
        );

        await insertChunk({
            chunkId: `chunk-other-space-${uniqueSuffix}`,
            documentId: otherSpaceDocument.id,
            spaceId: otherSpace.id,
            releaseVersionId: otherSpaceVersion.id,
            sectionId: "section-other-space",
            sectionTitle: "Section Other Space",
            content: "Chunk from other space",
            embedding: makeVector(1, 0),
        });

        const otherVersionDocument = await createPublishedDocument(
            targetSpace.id,
            targetSpaceKey,
            otherVersion.id,
            otherVersionKey,
            101,
        );

        await insertChunk({
            chunkId: `chunk-other-version-${uniqueSuffix}`,
            documentId: otherVersionDocument.id,
            spaceId: targetSpace.id,
            releaseVersionId: otherVersion.id,
            sectionId: "section-other-version",
            sectionTitle: "Section Other Version",
            content: "Chunk from other version",
            embedding: makeVector(1, 0),
        });
    });

    afterAll(async () => {
        if (prismaService) {
            await prismaService.space.deleteMany({
                where: {
                    key: {
                        in: [targetSpaceKey, otherSpaceKey],
                    },
                },
            });
        }

        if (app) {
            await app.close();
        }
    });

    it("returns semantic search results without auth, capped to 10, and scoped by space + version", async () => {
        const response = await request(app.getHttpServer()).post("/api/public/ai-context/search").send({
            query: queryText,
            space: targetSpaceKey,
            version: targetVersionKey,
        });

        expect(response.status).toBe(200);
        expect(() => AiContextResponseSchema.parse(response.body)).not.toThrow();
        expect(response.body.entityType).toBe("semantic-search");
        expect(response.body.entityId).toBe(queryText);
        expect(response.body.chunks.length).toBe(10);
        expect(
            response.body.chunks.every((chunk: { source: { space: string } }) => chunk.source.space === targetSpaceKey),
        ).toBe(true);
        expect(
            response.body.chunks.every(
                (chunk: { source: { versionId: string } }) => chunk.source.versionId === targetVersionId,
            ),
        ).toBe(true);
        expect(
            response.body.chunks.every((chunk: { source: Record<string, string> }) =>
                Object.values(chunk.source).every((value) => typeof value === "string" && value.length > 0),
            ),
        ).toBe(true);
    });

    it("returns chunks ordered by relevance score descending", async () => {
        const response = await request(app.getHttpServer()).post("/api/public/ai-context/search").send({
            query: queryText,
            space: targetSpaceKey,
            version: targetVersionKey,
        });

        expect(response.status).toBe(200);

        for (let index = 0; index < response.body.chunks.length - 1; index += 1) {
            expect(response.body.chunks[index].relevanceScore).toBeGreaterThanOrEqual(
                response.body.chunks[index + 1].relevanceScore,
            );
        }
    });

    it("returns 400 for missing or empty required body fields", async () => {
        const missingResponse = await request(app.getHttpServer()).post("/api/public/ai-context/search").send({});

        expect(missingResponse.status).toBe(400);

        const emptyResponse = await request(app.getHttpServer()).post("/api/public/ai-context/search").send({
            query: "",
            space: targetSpaceKey,
            version: targetVersionKey,
        });

        expect(emptyResponse.status).toBe(400);
    });

    it("returns 200 with empty chunks for unknown space or version", async () => {
        const unknownSpaceResponse = await request(app.getHttpServer()).post("/api/public/ai-context/search").send({
            query: queryText,
            space: "unknown-space",
            version: targetVersionKey,
        });

        expect(unknownSpaceResponse.status).toBe(200);
        expect(unknownSpaceResponse.body.chunks).toEqual([]);

        const unknownVersionResponse = await request(app.getHttpServer()).post("/api/public/ai-context/search").send({
            query: queryText,
            space: targetSpaceKey,
            version: "unknown-version",
        });

        expect(unknownVersionResponse.status).toBe(200);
        expect(unknownVersionResponse.body.chunks).toEqual([]);
    });

    it("returns 200 with empty chunks when the document_chunks table is empty", async () => {
        await prismaService.documentChunk.deleteMany({});

        const response = await request(app.getHttpServer()).post("/api/public/ai-context/search").send({
            query: queryText,
            space: targetSpaceKey,
            version: targetVersionKey,
        });

        expect(response.status).toBe(200);
        expect(response.body.chunks).toEqual([]);
    });

    it("returns 404 for GET /api/public/ai-context/search", async () => {
        const response = await request(app.getHttpServer()).get("/api/public/ai-context/search");

        expect([404, 405]).toContain(response.status);
    });
});
