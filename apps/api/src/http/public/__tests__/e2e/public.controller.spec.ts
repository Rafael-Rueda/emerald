import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { NavigationNodeType, ReleaseVersionStatus, ROLES } from "@prisma/client";
import bcrypt from "bcryptjs";
import request from "supertest";

import { AppModule } from "@/http/app.module";
import { PrismaService } from "@/infra/database/prisma/prisma.service";

const makeContent = (title: string, text: string) => ({
    type: "doc" as const,
    version: 1 as const,
    children: [
        {
            type: "heading" as const,
            level: 2 as const,
            id: "getting-started",
            children: [{ type: "text" as const, text: title }],
        },
        {
            type: "paragraph" as const,
            children: [{ type: "text" as const, text }],
        },
    ],
});

describe("PublicController (e2e)", () => {
    let app: INestApplication;
    let prismaService: PrismaService;

    const uniqueSuffix = `${Date.now()}`;
    const spaceKey = `testpublicspace${uniqueSuffix}`;
    const authorEmail = `testpublicauthor${uniqueSuffix}@test.com`;

    const publishedVersionKey = "v1";
    const draftVersionKey = "v2-draft";
    const publishedSlug = "getting-started";
    const draftSlug = "draft-doc";

    let spaceId: string;
    let publishedVersionId: string;
    let authorToken: string;
    let publishedDocumentId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prismaService = app.get(PrismaService);

        const passwordHash = await bcrypt.hash("password123", 10);

        await prismaService.user.upsert({
            where: { email: authorEmail },
            update: {
                username: `testpublicauthor${uniqueSuffix}`,
                passwordHash,
                roles: [ROLES.AUTHOR],
            },
            create: {
                username: `testpublicauthor${uniqueSuffix}`,
                email: authorEmail,
                passwordHash,
                roles: [ROLES.AUTHOR],
            },
        });

        const loginResponse = await request(app.getHttpServer()).post("/auth/login").send({
            email: authorEmail,
            password: "password123",
        });

        expect(loginResponse.status).toBe(200);
        authorToken = loginResponse.body.accessToken as string;

        const space = await prismaService.space.create({
            data: {
                key: spaceKey,
                name: "Public API Test Space",
                description: "Public endpoint validation",
            },
        });

        const publishedVersion = await prismaService.releaseVersion.create({
            data: {
                spaceId: space.id,
                key: publishedVersionKey,
                label: "Version 1",
                status: ReleaseVersionStatus.PUBLISHED,
                isDefault: true,
                publishedAt: new Date(),
            },
        });

        await prismaService.releaseVersion.create({
            data: {
                spaceId: space.id,
                key: draftVersionKey,
                label: "Version 2 Draft",
                status: ReleaseVersionStatus.DRAFT,
                isDefault: false,
            },
        });

        const createPublishedResponse = await request(app.getHttpServer())
            .post("/api/workspace/documents")
            .set("Authorization", `Bearer ${authorToken}`)
            .send({
                spaceId: space.id,
                releaseVersionId: publishedVersion.id,
                title: "Getting Started",
                slug: publishedSlug,
                content_json: makeContent("Getting Started", "Public getting guide content for search matching."),
            });

        expect(createPublishedResponse.status).toBe(201);
        publishedDocumentId = createPublishedResponse.body.id as string;

        const publishResponse = await request(app.getHttpServer())
            .post(`/api/workspace/documents/${publishedDocumentId}/publish`)
            .set("Authorization", `Bearer ${authorToken}`);

        expect(publishResponse.status).toBe(200);

        const createDraftResponse = await request(app.getHttpServer())
            .post("/api/workspace/documents")
            .set("Authorization", `Bearer ${authorToken}`)
            .send({
                spaceId: space.id,
                releaseVersionId: publishedVersion.id,
                title: "XDRAFTONLY987",
                slug: draftSlug,
                content_json: makeContent("Draft Only", "XDRAFTONLY987 should never appear in public search."),
            });

        expect(createDraftResponse.status).toBe(201);

        const groupNode = await prismaService.navigationNode.create({
            data: {
                spaceId: space.id,
                releaseVersionId: publishedVersion.id,
                documentId: null,
                parentId: null,
                label: "Getting Started Group",
                slug: "getting-started-group",
                order: 0,
                nodeType: NavigationNodeType.GROUP,
                externalUrl: null,
            },
        });

        await prismaService.navigationNode.create({
            data: {
                spaceId: space.id,
                releaseVersionId: publishedVersion.id,
                documentId: publishedDocumentId,
                parentId: groupNode.id,
                label: "Getting Started",
                slug: publishedSlug,
                order: 0,
                nodeType: NavigationNodeType.DOCUMENT,
                externalUrl: null,
            },
        });

        spaceId = space.id;
        publishedVersionId = publishedVersion.id;
    });

    afterAll(async () => {
        await prismaService.space.deleteMany({
            where: { key: spaceKey },
        });

        await prismaService.user.deleteMany({
            where: { email: authorEmail },
        });

        await app.close();
    });

    it("lists only published versions without requiring auth", async () => {
        const response = await request(app.getHttpServer()).get(`/api/public/spaces/${spaceKey}/versions`);

        expect(response.status).toBe(200);
        expect(response.body.space).toBe(spaceKey);
        expect(response.body.versions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: publishedVersionKey,
                    isDefault: true,
                    status: "published",
                }),
            ]),
        );
        expect(response.body.versions.some((version: { key: string }) => version.key === draftVersionKey)).toBe(false);
        expect(response.body.versions.filter((version: { isDefault: boolean }) => version.isDefault)).toHaveLength(1);
    });

    it("returns navigation tree for published space/version without auth", async () => {
        const response = await request(app.getHttpServer()).get(
            `/api/public/spaces/${spaceKey}/versions/${publishedVersionKey}/navigation`,
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({
                space: spaceKey,
                version: publishedVersionKey,
                items: expect.any(Array),
            }),
        );

        const rootNode = response.body.items.find((item: { slug: string }) => item.slug === "getting-started-group");
        expect(rootNode).toBeDefined();
        expect(rootNode.children).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    slug: publishedSlug,
                }),
            ]),
        );
    });

    it("returns published document with content_json + rendered_html without auth", async () => {
        const response = await request(app.getHttpServer()).get(
            `/api/public/spaces/${spaceKey}/versions/${publishedVersionKey}/documents/${publishedSlug}`,
        );

        expect(response.status).toBe(200);
        expect(response.body.document).toEqual(
            expect.objectContaining({
                slug: publishedSlug,
                status: "published",
                content_json: expect.objectContaining({ type: "doc", version: 1 }),
                rendered_html: expect.stringContaining("Getting Started"),
            }),
        );

        const currentRevision = await prismaService.documentRevision.findFirst({
            where: {
                documentId: publishedDocumentId,
                revisionNumber: 1,
            },
        });

        expect(currentRevision?.renderedHtml).toContain("Getting Started");
        expect(currentRevision?.plainText).toContain("Public getting guide content for search matching");
    });

    it("returns identical 404 payload for draft and nonexistent slugs", async () => {
        const draftResponse = await request(app.getHttpServer()).get(
            `/api/public/spaces/${spaceKey}/versions/${publishedVersionKey}/documents/${draftSlug}`,
        );

        const missingResponse = await request(app.getHttpServer()).get(
            `/api/public/spaces/${spaceKey}/versions/${publishedVersionKey}/documents/does-not-exist`,
        );

        expect(draftResponse.status).toBe(404);
        expect(missingResponse.status).toBe(404);
        expect(draftResponse.body).toEqual(missingResponse.body);
    });

    it("searches published documents and excludes draft documents", async () => {
        const matchedResponse = await request(app.getHttpServer())
            .get("/api/public/search")
            .query({ q: "getting" });

        expect(matchedResponse.status).toBe(200);
        expect(matchedResponse.body.results).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    slug: publishedSlug,
                    title: "Getting Started",
                }),
            ]),
        );

        const emptyResponse = await request(app.getHttpServer())
            .get("/api/public/search")
            .query({ q: "zzzznotaword" });

        expect(emptyResponse.status).toBe(200);
        expect(emptyResponse.body.results).toHaveLength(0);
        expect(emptyResponse.body.totalCount).toBe(0);

        const draftExcludedResponse = await request(app.getHttpServer())
            .get("/api/public/search")
            .query({ q: "XDRAFTONLY987" });

        expect(draftExcludedResponse.status).toBe(200);
        expect(draftExcludedResponse.body.results).toHaveLength(0);
    });

    it("handles sql-injection-like queries safely", async () => {
        const response = await request(app.getHttpServer())
            .get("/api/public/search")
            .query({ q: "'; DROP TABLE documents;--" });

        expect(response.status).toBe(200);
        expect(response.body.results).toHaveLength(0);

        const documentCount = await prismaService.document.count({
            where: {
                spaceId,
                releaseVersionId: publishedVersionId,
            },
        });

        expect(documentCount).toBeGreaterThan(0);
    });
});
