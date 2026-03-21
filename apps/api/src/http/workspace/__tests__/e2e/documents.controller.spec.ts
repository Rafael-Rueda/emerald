import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ReleaseVersionStatus, ROLES } from "@prisma/client";
import bcrypt from "bcryptjs";
import request from "supertest";

import { AppModule } from "@/http/app.module";
import { PrismaService } from "@/infra/database/prisma/prisma.service";

const makeContent = (text: string) => ({
    type: "doc",
    version: 1,
    children: [
        {
            type: "paragraph",
            children: [{ type: "text", text }],
        },
    ],
});

describe("DocumentsController + RevisionsController (e2e)", () => {
    let app: INestApplication;
    let prismaService: PrismaService;

    let spaceId: string;
    let releaseVersionV1Id: string;
    let releaseVersionV2Id: string;

    const uniqueSuffix = `${Date.now()}`;
    const spaceKey = `docs-e2e-${uniqueSuffix}`;
    const adminEmail = `docs-admin-${uniqueSuffix}@test.com`;
    const authorEmail = `docs-author-${uniqueSuffix}@test.com`;
    const viewerEmail = `docs-viewer-${uniqueSuffix}@test.com`;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prismaService = app.get(PrismaService);

        const passwordHash = await bcrypt.hash("password123", 10);

        await prismaService.user.upsert({
            where: { email: adminEmail },
            update: {
                username: `docs_admin_${uniqueSuffix}`,
                passwordHash,
                roles: [ROLES.SUPER_ADMIN],
            },
            create: {
                username: `docs_admin_${uniqueSuffix}`,
                email: adminEmail,
                passwordHash,
                roles: [ROLES.SUPER_ADMIN],
            },
        });

        await prismaService.user.upsert({
            where: { email: authorEmail },
            update: {
                username: `docs_author_${uniqueSuffix}`,
                passwordHash,
                roles: [ROLES.AUTHOR],
            },
            create: {
                username: `docs_author_${uniqueSuffix}`,
                email: authorEmail,
                passwordHash,
                roles: [ROLES.AUTHOR],
            },
        });

        await prismaService.user.upsert({
            where: { email: viewerEmail },
            update: {
                username: `docs_viewer_${uniqueSuffix}`,
                passwordHash,
                roles: [ROLES.VIEWER],
            },
            create: {
                username: `docs_viewer_${uniqueSuffix}`,
                email: viewerEmail,
                passwordHash,
                roles: [ROLES.VIEWER],
            },
        });

        const space = await prismaService.space.create({
            data: {
                key: spaceKey,
                name: "Documents E2E Space",
                description: "Documents e2e tests",
            },
        });

        const versionV1 = await prismaService.releaseVersion.create({
            data: {
                spaceId: space.id,
                key: `v1-${uniqueSuffix}`,
                label: "Version 1",
                status: ReleaseVersionStatus.PUBLISHED,
                isDefault: true,
                publishedAt: new Date(),
            },
        });

        const versionV2 = await prismaService.releaseVersion.create({
            data: {
                spaceId: space.id,
                key: `v2-${uniqueSuffix}`,
                label: "Version 2",
                status: ReleaseVersionStatus.DRAFT,
                isDefault: false,
            },
        });

        spaceId = space.id;
        releaseVersionV1Id = versionV1.id;
        releaseVersionV2Id = versionV2.id;
    });

    afterAll(async () => {
        await prismaService.space.deleteMany({
            where: { key: spaceKey },
        });

        await app.close();
    });

    const loginAndGetToken = async (email: string, password = "password123") => {
        const response = await request(app.getHttpServer()).post("/auth/login").send({ email, password });

        expect(response.status).toBe(200);

        return response.body.accessToken as string;
    };

    const createDocument = async (token: string, overrides?: Partial<Record<string, unknown>>) => {
        const slug = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        return request(app.getHttpServer())
            .post("/api/workspace/documents")
            .set("Authorization", `Bearer ${token}`)
            .send({
                spaceId,
                releaseVersionId: releaseVersionV1Id,
                title: "Doc Title",
                slug,
                content_json: makeContent("Initial content"),
                ...overrides,
            });
    };

    it("returns 401 for unauthenticated requests", async () => {
        const response = await request(app.getHttpServer()).get(`/api/workspace/documents?spaceId=${spaceId}`);

        expect(response.status).toBe(401);
    });

    it("creates document with 201 and draft status", async () => {
        const authorToken = await loginAndGetToken(authorEmail);

        const response = await createDocument(authorToken);

        expect(response.status).toBe(201);
        expect(response.body).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                status: "draft",
            }),
        );
    });

    it("returns 422 for missing required fields", async () => {
        const authorToken = await loginAndGetToken(authorEmail);

        const response = await request(app.getHttpServer())
            .post("/api/workspace/documents")
            .set("Authorization", `Bearer ${authorToken}`)
            .send({
                spaceId,
                releaseVersionId: releaseVersionV1Id,
                slug: `missing-title-${Date.now()}`,
                content_json: makeContent("Missing title"),
            });

        expect(response.status).toBe(422);
    });

    it("returns 409 when duplicate slug is created in same space and version", async () => {
        const authorToken = await loginAndGetToken(authorEmail);
        const duplicateSlug = `duplicate-${Date.now()}`;

        const firstResponse = await createDocument(authorToken, {
            slug: duplicateSlug,
        });

        expect(firstResponse.status).toBe(201);

        const secondResponse = await createDocument(authorToken, {
            slug: duplicateSlug,
        });

        expect(secondResponse.status).toBe(409);
    });

    it("allows same slug in different release versions", async () => {
        const authorToken = await loginAndGetToken(authorEmail);
        const sharedSlug = `cross-version-${Date.now()}`;

        const v1Response = await createDocument(authorToken, {
            slug: sharedSlug,
            releaseVersionId: releaseVersionV1Id,
        });

        const v2Response = await createDocument(authorToken, {
            slug: sharedSlug,
            releaseVersionId: releaseVersionV2Id,
        });

        expect(v1Response.status).toBe(201);
        expect(v2Response.status).toBe(201);
    });

    it("gets document by id with full payload", async () => {
        const authorToken = await loginAndGetToken(authorEmail);
        const createResponse = await createDocument(authorToken, {
            title: "Get By Id",
        });

        const documentId = createResponse.body.id as string;

        const response = await request(app.getHttpServer())
            .get(`/api/workspace/documents/${documentId}`)
            .set("Authorization", `Bearer ${authorToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({
                id: documentId,
                title: "Get By Id",
                slug: expect.any(String),
                spaceId,
                content_json: expect.any(Object),
            }),
        );
    });

    it("lists paginated documents by space", async () => {
        const authorToken = await loginAndGetToken(authorEmail);

        await createDocument(authorToken, { title: "List One" });
        await createDocument(authorToken, { title: "List Two" });

        const response = await request(app.getHttpServer())
            .get(`/api/workspace/documents?spaceId=${spaceId}&limit=1&page=1`)
            .set("Authorization", `Bearer ${authorToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({
                documents: expect.any(Array),
                total: expect.any(Number),
                page: 1,
                limit: 1,
            }),
        );
        expect(response.body.documents).toHaveLength(1);
    });

    it("patch updates title and content_json", async () => {
        const authorToken = await loginAndGetToken(authorEmail);
        const createResponse = await createDocument(authorToken, {
            title: "Before Patch",
        });

        const documentId = createResponse.body.id as string;

        const patchResponse = await request(app.getHttpServer())
            .patch(`/api/workspace/documents/${documentId}`)
            .set("Authorization", `Bearer ${authorToken}`)
            .send({
                title: "After Patch",
                content_json: makeContent("Updated via patch"),
            });

        expect(patchResponse.status).toBe(200);
        expect(patchResponse.body).toEqual(
            expect.objectContaining({
                id: documentId,
                title: "After Patch",
                content_json: makeContent("Updated via patch"),
            }),
        );
    });

    it("publish endpoint is idempotent", async () => {
        const authorToken = await loginAndGetToken(authorEmail);
        const createResponse = await createDocument(authorToken, {
            title: "Publish Me",
        });

        const documentId = createResponse.body.id as string;

        const firstPublish = await request(app.getHttpServer())
            .post(`/api/workspace/documents/${documentId}/publish`)
            .set("Authorization", `Bearer ${authorToken}`);

        const secondPublish = await request(app.getHttpServer())
            .post(`/api/workspace/documents/${documentId}/publish`)
            .set("Authorization", `Bearer ${authorToken}`);

        expect(firstPublish.status).toBe(200);
        expect(secondPublish.status).toBe(200);
        expect(firstPublish.body.status).toBe("published");
        expect(secondPublish.body.status).toBe("published");
    });

    it("creates and lists revisions", async () => {
        const authorToken = await loginAndGetToken(authorEmail);
        const createResponse = await createDocument(authorToken, {
            title: "Revision Doc",
        });

        const documentId = createResponse.body.id as string;

        const createRevisionResponse = await request(app.getHttpServer())
            .post(`/api/workspace/documents/${documentId}/revisions`)
            .set("Authorization", `Bearer ${authorToken}`)
            .send({
                content_json: makeContent("Second revision"),
                changeNote: "Revision update",
            });

        expect(createRevisionResponse.status).toBe(201);
        expect(createRevisionResponse.body.revisionNumber).toBe(2);

        const listRevisionsResponse = await request(app.getHttpServer())
            .get(`/api/workspace/documents/${documentId}/revisions`)
            .set("Authorization", `Bearer ${authorToken}`);

        expect(listRevisionsResponse.status).toBe(200);
        expect(listRevisionsResponse.body).toEqual(
            expect.objectContaining({
                revisions: expect.any(Array),
                total: expect.any(Number),
            }),
        );
        expect(listRevisionsResponse.body.total).toBeGreaterThanOrEqual(2);
    });

    it("blocks VIEWER from write operations", async () => {
        const viewerToken = await loginAndGetToken(viewerEmail);

        const response = await createDocument(viewerToken, {
            title: "Viewer Blocked",
        });

        expect(response.status).toBe(403);
    });
});
