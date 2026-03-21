import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ReleaseVersionStatus, ROLES } from "@prisma/client";
import bcrypt from "bcryptjs";
import request from "supertest";

import { AppModule } from "@/http/app.module";
import { PrismaService } from "@/infra/database/prisma/prisma.service";

describe("VersionsController (e2e)", () => {
    let app: INestApplication;
    let prismaService: PrismaService;

    let spaceId: string;
    let defaultVersionId: string;
    let secondaryVersionId: string;

    const uniqueSuffix = `${Date.now()}`;
    const spaceKey = `testspacever-${uniqueSuffix}`;
    const authorEmail = `testversions-author-${uniqueSuffix}@test.com`;

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
                username: `ver_author_${uniqueSuffix}`,
                passwordHash,
                roles: [ROLES.AUTHOR],
            },
            create: {
                username: `ver_author_${uniqueSuffix}`,
                email: authorEmail,
                passwordHash,
                roles: [ROLES.AUTHOR],
            },
        });

        const space = await prismaService.space.create({
            data: {
                key: spaceKey,
                name: "Versions Test Space",
                description: "Versions e2e tests",
            },
        });

        const defaultVersion = await prismaService.releaseVersion.create({
            data: {
                spaceId: space.id,
                key: `v1-${uniqueSuffix}`,
                label: "Version 1",
                status: ReleaseVersionStatus.PUBLISHED,
                isDefault: true,
                publishedAt: new Date(),
            },
        });

        const secondaryVersion = await prismaService.releaseVersion.create({
            data: {
                spaceId: space.id,
                key: `v2-${uniqueSuffix}`,
                label: "Version 2",
                status: ReleaseVersionStatus.DRAFT,
                isDefault: false,
            },
        });

        spaceId = space.id;
        defaultVersionId = defaultVersion.id;
        secondaryVersionId = secondaryVersion.id;
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

    it("creates a release version with 201", async () => {
        const authorToken = await loginAndGetToken(authorEmail);
        const uniqueKey = `v3-${Date.now()}`;

        const response = await request(app.getHttpServer())
            .post("/api/workspace/versions")
            .set("Authorization", `Bearer ${authorToken}`)
            .send({
                spaceId,
                key: uniqueKey,
                label: "Version 3",
            });

        expect(response.status).toBe(201);
        expect(response.body).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                spaceId,
                key: uniqueKey,
                status: "draft",
            }),
        );
    });

    it("returns 409 for duplicate key in the same space", async () => {
        const authorToken = await loginAndGetToken(authorEmail);
        const duplicateKey = `dup-${Date.now()}`;

        const firstCreate = await request(app.getHttpServer())
            .post("/api/workspace/versions")
            .set("Authorization", `Bearer ${authorToken}`)
            .send({
                spaceId,
                key: duplicateKey,
                label: "Duplicate Candidate",
            });

        expect(firstCreate.status).toBe(201);

        const secondCreate = await request(app.getHttpServer())
            .post("/api/workspace/versions")
            .set("Authorization", `Bearer ${authorToken}`)
            .send({
                spaceId,
                key: duplicateKey,
                label: "Duplicate Candidate Again",
            });

        expect(secondCreate.status).toBe(409);
    });

    it("lists versions by space", async () => {
        const authorToken = await loginAndGetToken(authorEmail);

        const response = await request(app.getHttpServer())
            .get(`/api/workspace/versions?spaceId=${spaceId}`)
            .set("Authorization", `Bearer ${authorToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({
                versions: expect.any(Array),
                total: expect.any(Number),
            }),
        );
        expect(response.body.versions.length).toBeGreaterThanOrEqual(2);
    });

    it("gets a version by id", async () => {
        const authorToken = await loginAndGetToken(authorEmail);

        const response = await request(app.getHttpServer())
            .get(`/api/workspace/versions/${defaultVersionId}`)
            .set("Authorization", `Bearer ${authorToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({
                id: defaultVersionId,
                spaceId,
                key: expect.any(String),
            }),
        );
    });

    it("publishes a release version", async () => {
        const authorToken = await loginAndGetToken(authorEmail);

        const response = await request(app.getHttpServer())
            .post(`/api/workspace/versions/${secondaryVersionId}/publish`)
            .set("Authorization", `Bearer ${authorToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe("published");
        expect(response.body.publishedAt).toEqual(expect.any(String));
    });

    it("sets default version atomically (only one default remains)", async () => {
        const authorToken = await loginAndGetToken(authorEmail);

        const setDefaultResponse = await request(app.getHttpServer())
            .post(`/api/workspace/versions/${secondaryVersionId}/set-default`)
            .set("Authorization", `Bearer ${authorToken}`);

        expect(setDefaultResponse.status).toBe(200);
        expect(setDefaultResponse.body.id).toBe(secondaryVersionId);
        expect(setDefaultResponse.body.isDefault).toBe(true);

        const listResponse = await request(app.getHttpServer())
            .get(`/api/workspace/versions?spaceId=${spaceId}`)
            .set("Authorization", `Bearer ${authorToken}`);

        expect(listResponse.status).toBe(200);

        const defaultVersions = listResponse.body.versions.filter(
            (version: { isDefault: boolean }) => version.isDefault === true,
        );

        expect(defaultVersions).toHaveLength(1);
        expect(defaultVersions[0].id).toBe(secondaryVersionId);
    });

    it("archives a release version via PATCH /api/workspace/versions/:id", async () => {
        const authorToken = await loginAndGetToken(authorEmail);

        const response = await request(app.getHttpServer())
            .patch(`/api/workspace/versions/${defaultVersionId}`)
            .set("Authorization", `Bearer ${authorToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe("archived");
        expect(response.body.isDefault).toBe(false);
    });
});
