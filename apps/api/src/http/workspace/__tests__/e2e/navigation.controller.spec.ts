import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ReleaseVersionStatus, ROLES } from "@prisma/client";
import bcrypt from "bcryptjs";
import request from "supertest";

import { AppModule } from "@/http/app.module";
import { PrismaService } from "@/infra/database/prisma/prisma.service";

describe("NavigationController (e2e)", () => {
    let app: INestApplication;
    let prismaService: PrismaService;

    let spaceId: string;

    const uniqueSuffix = `${Date.now()}`;
    const spaceKey = `testnav-space-${uniqueSuffix}`;
    const authorEmail = `testnav-author-${uniqueSuffix}@test.com`;
    const viewerEmail = `testnav-viewer-${uniqueSuffix}@test.com`;

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
                username: `testnav_author_${uniqueSuffix}`,
                passwordHash,
                roles: [ROLES.AUTHOR],
            },
            create: {
                username: `testnav_author_${uniqueSuffix}`,
                email: authorEmail,
                passwordHash,
                roles: [ROLES.AUTHOR],
            },
        });

        await prismaService.user.upsert({
            where: { email: viewerEmail },
            update: {
                username: `testnav_viewer_${uniqueSuffix}`,
                passwordHash,
                roles: [ROLES.VIEWER],
            },
            create: {
                username: `testnav_viewer_${uniqueSuffix}`,
                email: viewerEmail,
                passwordHash,
                roles: [ROLES.VIEWER],
            },
        });

        const space = await prismaService.space.create({
            data: {
                key: spaceKey,
                name: "Test Navigation Space",
                description: "Test navigation features",
            },
        });

        await prismaService.releaseVersion.create({
            data: {
                spaceId: space.id,
                key: `v1-${uniqueSuffix}`,
                label: "Version 1",
                status: ReleaseVersionStatus.PUBLISHED,
                isDefault: true,
                publishedAt: new Date(),
            },
        });

        spaceId = space.id;
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

    const createNode = async (token: string, overrides?: Partial<Record<string, unknown>>) => {
        const unique = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        return request(app.getHttpServer())
            .post("/api/workspace/navigation")
            .set("Authorization", `Bearer ${token}`)
            .send({
                spaceId,
                label: `Node ${unique}`,
                slug: `node-${unique}`,
                order: 0,
                nodeType: "group",
                ...overrides,
            });
    };

    it("creates a navigation node with 201", async () => {
        const authorToken = await loginAndGetToken(authorEmail);

        const response = await createNode(authorToken, {
            label: "Root Node",
            slug: `root-${Date.now()}`,
        });

        expect(response.status).toBe(201);
        expect(response.body).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                spaceId,
                label: "Root Node",
            }),
        );
    });

    it("returns hierarchical tree with nested children", async () => {
        const authorToken = await loginAndGetToken(authorEmail);
        const parentSlug = `parent-${Date.now()}`;
        const childSlug = `child-${Date.now()}`;

        const parent = await createNode(authorToken, {
            label: "Parent",
            slug: parentSlug,
            order: 0,
        });

        const child = await createNode(authorToken, {
            label: "Child",
            slug: childSlug,
            parentId: parent.body.id,
            order: 0,
        });

        expect(parent.status).toBe(201);
        expect(child.status).toBe(201);

        const treeResponse = await request(app.getHttpServer())
            .get(`/api/workspace/navigation?spaceId=${spaceId}`)
            .set("Authorization", `Bearer ${authorToken}`);

        expect(treeResponse.status).toBe(200);
        expect(treeResponse.body.items).toEqual(expect.any(Array));

        const parentNode = treeResponse.body.items.find((item: { id: string }) => item.id === parent.body.id);

        expect(parentNode).toBeDefined();
        expect(parentNode.children).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: child.body.id,
                    label: "Child",
                }),
            ]),
        );
    });

    it("moves a node and updates tree structure", async () => {
        const authorToken = await loginAndGetToken(authorEmail);

        const sourceParent = await createNode(authorToken, {
            label: "Source Parent",
            slug: `source-${Date.now()}`,
            order: 0,
        });

        const destinationParent = await createNode(authorToken, {
            label: "Destination Parent",
            slug: `destination-${Date.now()}`,
            order: 1,
        });

        const child = await createNode(authorToken, {
            label: "Movable Child",
            slug: `movable-${Date.now()}`,
            parentId: sourceParent.body.id,
            order: 0,
        });

        const moveResponse = await request(app.getHttpServer())
            .post(`/api/workspace/navigation/${child.body.id}/move`)
            .set("Authorization", `Bearer ${authorToken}`)
            .send({
                parentId: destinationParent.body.id,
                order: 0,
            });

        expect(moveResponse.status).toBe(200);
        expect(moveResponse.body).toEqual(
            expect.objectContaining({
                id: child.body.id,
                parentId: destinationParent.body.id,
                order: 0,
            }),
        );

        const treeResponse = await request(app.getHttpServer())
            .get(`/api/workspace/navigation?spaceId=${spaceId}`)
            .set("Authorization", `Bearer ${authorToken}`);

        const destinationNode = treeResponse.body.items.find(
            (item: { id: string }) => item.id === destinationParent.body.id,
        );

        expect(destinationNode.children).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: child.body.id,
                }),
            ]),
        );
    });

    it("returns 400 when moving a node under one of its descendants", async () => {
        const authorToken = await loginAndGetToken(authorEmail);

        const root = await createNode(authorToken, {
            label: "Root Circular",
            slug: `root-circular-${Date.now()}`,
            order: 0,
        });

        const child = await createNode(authorToken, {
            label: "Child Circular",
            slug: `child-circular-${Date.now()}`,
            parentId: root.body.id,
            order: 0,
        });

        const grandchild = await createNode(authorToken, {
            label: "Grandchild Circular",
            slug: `grandchild-circular-${Date.now()}`,
            parentId: child.body.id,
            order: 0,
        });

        const moveResponse = await request(app.getHttpServer())
            .post(`/api/workspace/navigation/${root.body.id}/move`)
            .set("Authorization", `Bearer ${authorToken}`)
            .send({
                parentId: grandchild.body.id,
                order: 0,
            });

        expect(moveResponse.status).toBe(400);
        expect(String(moveResponse.body.message).toLowerCase()).toContain("circular");

        const treeResponse = await request(app.getHttpServer())
            .get(`/api/workspace/navigation?spaceId=${spaceId}`)
            .set("Authorization", `Bearer ${authorToken}`);

        const rootNode = treeResponse.body.items.find((item: { id: string }) => item.id === root.body.id);

        expect(rootNode).toBeDefined();
        expect(rootNode.parentId).toBeNull();
    });

    it("allows authenticated reads but blocks viewer writes", async () => {
        const viewerToken = await loginAndGetToken(viewerEmail);

        const readResponse = await request(app.getHttpServer())
            .get(`/api/workspace/navigation?spaceId=${spaceId}`)
            .set("Authorization", `Bearer ${viewerToken}`);

        expect(readResponse.status).toBe(200);

        const writeResponse = await createNode(viewerToken, {
            label: "Viewer Blocked",
            slug: `viewer-blocked-${Date.now()}`,
        });

        expect(writeResponse.status).toBe(403);
    });
});
