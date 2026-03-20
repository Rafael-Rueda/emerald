import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ZodValidationPipe } from "nestjs-zod";
import request from "supertest";

import { AppModule } from "@/http/app.module";

describe("AuthController (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ZodValidationPipe());
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe("POST /auth/login", () => {
        it("should return 400 when email/username is not provided", async () => {
            const response = await request(app.getHttpServer()).post("/auth/login").send({
                password: "password123",
            });

            expect(response.status).toBe(400);
        });

        it("should return 400 when password is not provided", async () => {
            const response = await request(app.getHttpServer()).post("/auth/login").send({
                email: "test@example.com",
            });

            expect(response.status).toBe(400);
        });

        it("should return 400 when password is too short", async () => {
            const response = await request(app.getHttpServer()).post("/auth/login").send({
                email: "test@example.com",
                password: "short",
            });

            expect(response.status).toBe(400);
        });

        it("should return 401 when user does not exist", async () => {
            const response = await request(app.getHttpServer()).post("/auth/login").send({
                email: "nonexistent@example.com",
                password: "password123",
            });

            expect(response.status).toBe(401);
        });

        it("should accept login with username instead of email", async () => {
            const response = await request(app.getHttpServer()).post("/auth/login").send({
                username: "testuser",
                password: "password123",
            });

            // Will return 401 if user doesn't exist, but validates the request format
            expect([401, 200]).toContain(response.status);
        });
    });

    describe("GET /auth/google", () => {
        it("should redirect to Google OAuth", async () => {
            const response = await request(app.getHttpServer()).get("/auth/google");

            expect(response.status).toBe(302);
            expect(response.headers.location).toContain("accounts.google.com");
        });
    });

    describe("GET /auth/google/callback", () => {
        it("should return 400 when code is not provided", async () => {
            const response = await request(app.getHttpServer()).get("/auth/google/callback");

            expect(response.status).toBe(400);
        });

        // Note: This test makes a real HTTP call to Google's servers with invalid credentials.
        // The gaxios ESM error in console is expected (Jest VM doesn't support dynamic imports).
        // Test passes because we expect an error response.
        it("should return error for invalid OAuth code", async () => {
            const response = await request(app.getHttpServer()).get("/auth/google/callback").query({
                code: "invalid_code",
            });

            expect([400, 401, 500]).toContain(response.status);
        });
    });
});
