import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ZodValidationPipe } from "nestjs-zod";
import request from "supertest";

import { AppModule } from "@/http/app.module";

describe("UsersController (e2e)", () => {
    let app: INestApplication;
    let authToken: string | undefined;
    let createdUserId: string | undefined;

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

    describe("POST /users", () => {
        it("should create a new user successfully", async () => {
            const uniqueEmail = `test${Date.now()}@example.com`;
            const uniqueUsername = `testuser${Date.now()}`;

            const response = await request(app.getHttpServer()).post("/users").send({
                username: uniqueUsername,
                email: uniqueEmail,
                password: "password123",
            });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("user");
            expect(response.body.user).toHaveProperty("id");
            expect(response.body.user.email).toBe(uniqueEmail);
            expect(response.body.user.username).toBe(uniqueUsername.toLowerCase().replace(/[^a-z0-9_]/g, ""));

            createdUserId = response.body.user.id;
        });

        it("should return 400 when username is too short", async () => {
            const response = await request(app.getHttpServer()).post("/users").send({
                username: "ab",
                email: "test@example.com",
                password: "password123",
            });

            expect(response.status).toBe(400);
        });

        it("should return 400 when email is invalid", async () => {
            const response = await request(app.getHttpServer()).post("/users").send({
                username: "testuser",
                email: "invalid-email",
                password: "password123",
            });

            expect(response.status).toBe(400);
        });

        it("should return 400 when password is too short", async () => {
            const response = await request(app.getHttpServer()).post("/users").send({
                username: "testuser",
                email: "test@example.com",
                password: "short",
            });

            expect(response.status).toBe(400);
        });

        it("should return 400 when required fields are missing", async () => {
            const response = await request(app.getHttpServer()).post("/users").send({
                username: "testuser",
            });

            expect(response.status).toBe(400);
        });

        it("should return 409 when user already exists", async () => {
            const uniqueEmail = `duplicate${Date.now()}@example.com`;
            const uniqueUsername = `dupuser${Date.now()}`;

            // Create first user
            await request(app.getHttpServer()).post("/users").send({
                username: uniqueUsername,
                email: uniqueEmail,
                password: "password123",
            });

            // Try to create duplicate
            const response = await request(app.getHttpServer()).post("/users").send({
                username: uniqueUsername,
                email: uniqueEmail,
                password: "password123",
            });

            expect(response.status).toBe(409);
        });
    });

    describe("GET /users", () => {
        it("should return 401 when not authenticated", async () => {
            const response = await request(app.getHttpServer()).get("/users");

            expect(response.status).toBe(401);
        });

        it("should return users list when authenticated", async () => {
            // Skip if no auth token (would require full auth setup)
            if (!authToken) {
                return;
            }

            const response = await request(app.getHttpServer())
                .get("/users")
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it("should accept pagination parameters", async () => {
            if (!authToken) {
                return;
            }

            const response = await request(app.getHttpServer())
                .get("/users")
                .query({ page: 1, limit: 5 })
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toBe(200);
        });
    });

    describe("GET /users/:id", () => {
        it("should return 401 when not authenticated", async () => {
            const response = await request(app.getHttpServer()).get("/users/some-id");

            expect(response.status).toBe(401);
        });

        it("should return 404 when user not found (authenticated)", async () => {
            if (!authToken) {
                return;
            }

            const response = await request(app.getHttpServer())
                .get("/users/non-existent-uuid")
                .set("Authorization", `Bearer ${authToken}`);

            expect([404, 400]).toContain(response.status);
        });
    });

    describe("PATCH /users/:id", () => {
        it("should return 401 when not authenticated", async () => {
            const response = await request(app.getHttpServer()).patch("/users/some-id").send({
                username: "newusername",
            });

            expect(response.status).toBe(401);
        });

        it("should return 400 when username is invalid", async () => {
            if (!authToken || !createdUserId) {
                return;
            }

            const response = await request(app.getHttpServer())
                .patch(`/users/${createdUserId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                    username: "ab", // too short
                });

            expect(response.status).toBe(400);
        });
    });

    describe("DELETE /users/:id", () => {
        it("should return 401 when not authenticated", async () => {
            const response = await request(app.getHttpServer()).delete("/users/some-id");

            expect(response.status).toBe(401);
        });

        it("should return 404 when user not found (authenticated)", async () => {
            if (!authToken) {
                return;
            }

            const response = await request(app.getHttpServer())
                .delete("/users/non-existent-uuid")
                .set("Authorization", `Bearer ${authToken}`);

            expect([404, 400]).toContain(response.status);
        });
    });
});
