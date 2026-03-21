import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ROLES } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ZodValidationPipe } from "nestjs-zod";
import request from "supertest";

import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { AppModule } from "@/http/app.module";

describe("SpacesController (e2e)", () => {
    let app: INestApplication;
    let prismaService: PrismaService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ZodValidationPipe());
        await app.init();

        prismaService = app.get(PrismaService);

        const passwordHash = await bcrypt.hash("password123", 10);

        await prismaService.user.upsert({
            where: { email: "admin@test.com" },
            update: {
                username: "admin",
                passwordHash,
                roles: [ROLES.SUPER_ADMIN],
            },
            create: {
                username: "admin",
                email: "admin@test.com",
                passwordHash,
                roles: [ROLES.SUPER_ADMIN],
            },
        });

        await prismaService.user.upsert({
            where: { email: "viewer@test.com" },
            update: {
                username: "viewer",
                passwordHash,
                roles: [ROLES.VIEWER],
            },
            create: {
                username: "viewer",
                email: "viewer@test.com",
                passwordHash,
                roles: [ROLES.VIEWER],
            },
        });
    });

    afterAll(async () => {
        await prismaService.space.deleteMany({
            where: {
                key: {
                    startsWith: "space-e2e-",
                },
            },
        });

        await app.close();
    });

    const loginAndGetToken = async (email: string, password = "password123") => {
        const response = await request(app.getHttpServer()).post("/auth/login").send({ email, password });

        expect(response.status).toBe(200);

        return response.body.accessToken as string;
    };

    it("SUPER_ADMIN can create, get, update and delete spaces", async () => {
        const superAdminToken = await loginAndGetToken("admin@test.com");
        const uniqueKey = `space-e2e-${Date.now()}`;

        const createResponse = await request(app.getHttpServer())
            .post("/api/workspace/spaces")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                key: uniqueKey,
                name: "Space E2E",
                description: "Space E2E description",
            });

        expect(createResponse.status).toBe(201);
        expect(createResponse.body).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                key: uniqueKey,
                name: "Space E2E",
                description: "Space E2E description",
            }),
        );

        const spaceId = createResponse.body.id as string;

        const getResponse = await request(app.getHttpServer())
            .get(`/api/workspace/spaces/${spaceId}`)
            .set("Authorization", `Bearer ${superAdminToken}`);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body).toEqual(
            expect.objectContaining({
                id: spaceId,
                key: uniqueKey,
                name: "Space E2E",
                description: "Space E2E description",
            }),
        );

        const updateResponse = await request(app.getHttpServer())
            .patch(`/api/workspace/spaces/${spaceId}`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Updated Space E2E",
            });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body).toEqual(
            expect.objectContaining({
                id: spaceId,
                key: uniqueKey,
                name: "Updated Space E2E",
                description: "Space E2E description",
            }),
        );

        const deleteResponse = await request(app.getHttpServer())
            .delete(`/api/workspace/spaces/${spaceId}`)
            .set("Authorization", `Bearer ${superAdminToken}`);

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body).toEqual(
            expect.objectContaining({
                id: spaceId,
            }),
        );

        const deletedGetResponse = await request(app.getHttpServer())
            .get(`/api/workspace/spaces/${spaceId}`)
            .set("Authorization", `Bearer ${superAdminToken}`);

        expect(deletedGetResponse.status).toBe(404);
    });

    it("allows authenticated users to read and blocks VIEWER writes", async () => {
        const viewerToken = await loginAndGetToken("viewer@test.com");

        const listResponse = await request(app.getHttpServer())
            .get("/api/workspace/spaces")
            .set("Authorization", `Bearer ${viewerToken}`);

        expect(listResponse.status).toBe(200);
        expect(listResponse.body).toEqual(
            expect.objectContaining({
                spaces: expect.any(Array),
                total: expect.any(Number),
            }),
        );

        const createResponse = await request(app.getHttpServer())
            .post("/api/workspace/spaces")
            .set("Authorization", `Bearer ${viewerToken}`)
            .send({
                key: `space-e2e-${Date.now()}-viewer`,
                name: "Blocked for viewer",
            });

        expect(createResponse.status).toBe(403);
    });
});
