import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { ROLES } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ZodValidationPipe } from "nestjs-zod";
import request from "supertest";

import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { AppModule } from "@/http/app.module";

describe("AuthController (e2e)", () => {
    let app: INestApplication;
    let prismaService: PrismaService;
    let jwtService: JwtService;

    const googleAuthProviderMock = {
        getRedirectUrl: jest.fn(),
        getUserFromCode: jest.fn(),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider("GoogleAuthProvider")
            .useValue(googleAuthProviderMock)
            .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ZodValidationPipe());
        await app.init();

        prismaService = app.get(PrismaService);
        jwtService = app.get(JwtService);

        googleAuthProviderMock.getRedirectUrl.mockReturnValue(
            "https://accounts.google.com/o/oauth2/v2/auth?client_id=test-client-id",
        );

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

        await prismaService.user.upsert({
            where: { email: "author@test.com" },
            update: {
                username: "author",
                passwordHash,
                roles: [ROLES.AUTHOR],
            },
            create: {
                username: "author",
                email: "author@test.com",
                passwordHash,
                roles: [ROLES.AUTHOR],
            },
        });
    });

    afterAll(async () => {
        await app.close();
    });

    const loginAndGetToken = async (email: string, password = "password123") => {
        const response = await request(app.getHttpServer()).post("/auth/login").send({ email, password });

        expect(response.status).toBe(200);
        return response.body.accessToken as string;
    };

    describe("POST /auth/login", () => {
        it("returns JWT with RS256 header for valid credentials", async () => {
            const response = await request(app.getHttpServer()).post("/auth/login").send({
                email: "admin@test.com",
                password: "password123",
            });

            expect(response.status).toBe(200);
            expect(response.body.accessToken).toBeDefined();

            const [headerBase64] = response.body.accessToken.split(".");
            const header = JSON.parse(Buffer.from(headerBase64, "base64url").toString("utf8"));

            expect(header.alg).toBe("RS256");
        });

        it("returns 401 for invalid credentials", async () => {
            const response = await request(app.getHttpServer()).post("/auth/login").send({
                email: "admin@test.com",
                password: "wrong-password",
            });

            expect(response.status).toBe(401);
        });

        it("returns 400 for malformed payload", async () => {
            const response = await request(app.getHttpServer()).post("/auth/login").send({
                email: "not-an-email",
            });

            expect(response.status).toBe(400);
        });
    });

    describe("GET /auth/google", () => {
        it("redirects to Google OAuth", async () => {
            const response = await request(app.getHttpServer()).get("/auth/google");

            expect(response.status).toBe(302);
            expect(response.headers.location).toContain("accounts.google.com");
        });
    });

    describe("GET /auth/google/callback", () => {
        it("returns 400 when code is not provided", async () => {
            const response = await request(app.getHttpServer()).get("/auth/google/callback");

            expect(response.status).toBe(400);
        });

        it("upserts user and assigns VIEWER role by default", async () => {
            const oauthEmail = "oauth-viewer@test.com";

            googleAuthProviderMock.getUserFromCode
                .mockResolvedValueOnce({
                    id: "google-oauth-id",
                    email: oauthEmail,
                    name: "OAuth Viewer",
                })
                .mockResolvedValueOnce({
                    id: "google-oauth-id",
                    email: oauthEmail,
                    name: "OAuth Viewer Updated",
                });

            const firstCallback = await request(app.getHttpServer()).get("/auth/google/callback").query({
                code: "oauth-code-1",
            });

            expect(firstCallback.status).toBe(200);
            expect(firstCallback.body.user.roles).toEqual([ROLES.VIEWER]);

            const firstUser = await prismaService.user.findUnique({
                where: { email: oauthEmail },
            });

            expect(firstUser).not.toBeNull();
            expect(firstUser?.roles).toEqual([ROLES.VIEWER]);

            const secondCallback = await request(app.getHttpServer()).get("/auth/google/callback").query({
                code: "oauth-code-2",
            });

            expect(secondCallback.status).toBe(200);

            const sameUser = await prismaService.user.findUnique({
                where: { email: oauthEmail },
            });
            const duplicateCount = await prismaService.user.count({
                where: { email: oauthEmail },
            });

            expect(duplicateCount).toBe(1);
            expect(sameUser?.id).toBe(firstUser?.id);
            expect(sameUser?.username).toBe("oauth_viewer_updated");
        });
    });

    describe("Authorization and RBAC", () => {
        it("returns 401 for unauthenticated access to protected routes", async () => {
            const response = await request(app.getHttpServer()).get("/api/workspace/documents");

            expect(response.status).toBe(401);
        });

        it("allows SUPER_ADMIN on workspace routes", async () => {
            const superAdminToken = await loginAndGetToken("admin@test.com");

            const listResponse = await request(app.getHttpServer())
                .get("/api/workspace/documents")
                .set("Authorization", `Bearer ${superAdminToken}`);

            const createResponse = await request(app.getHttpServer())
                .post("/api/workspace/documents")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({ title: "Auth Spec" });

            expect(listResponse.status).toBe(200);
            expect(createResponse.status).toBe(201);
        });

        it("returns 403 for VIEWER on workspace write routes", async () => {
            const viewerToken = await loginAndGetToken("viewer@test.com");

            const response = await request(app.getHttpServer())
                .post("/api/workspace/documents")
                .set("Authorization", `Bearer ${viewerToken}`)
                .send({ title: "Blocked write" });

            expect(response.status).toBe(403);
        });

        it("returns 403 for AUTHOR on GET /users", async () => {
            const authorToken = await loginAndGetToken("author@test.com");

            const response = await request(app.getHttpServer())
                .get("/users")
                .set("Authorization", `Bearer ${authorToken}`);

            expect(response.status).toBe(403);
        });

        it("returns 401 for expired JWT", async () => {
            const user = await prismaService.user.findUniqueOrThrow({
                where: { email: "admin@test.com" },
            });

            const expiredToken = await jwtService.signAsync(
                {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    roles: user.roles,
                },
                { expiresIn: "-1s" },
            );

            const response = await request(app.getHttpServer())
                .get("/api/workspace/documents")
                .set("Authorization", `Bearer ${expiredToken}`);

            expect(response.status).toBe(401);
        });

        it("returns 401 for tampered JWT", async () => {
            const validToken = await loginAndGetToken("viewer@test.com");
            const [header, payload, signature] = validToken.split(".");

            const decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
            decodedPayload.roles = [ROLES.SUPER_ADMIN];

            const tamperedPayload = Buffer.from(JSON.stringify(decodedPayload)).toString("base64url");
            const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

            const response = await request(app.getHttpServer())
                .get("/api/workspace/documents")
                .set("Authorization", `Bearer ${tamperedToken}`);

            expect(response.status).toBe(401);
        });
    });
});
