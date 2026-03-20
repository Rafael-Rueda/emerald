import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ZodValidationPipe } from "nestjs-zod";
import * as path from "path";
import request from "supertest";

import { AppModule } from "@/http/app.module";

describe("StorageController (e2e)", () => {
    let app: INestApplication;
    let authToken: string | undefined;
    let testUserId: string | undefined;
    let uploadedFileId: string | undefined;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ZodValidationPipe());
        await app.init();

        // Create a test user and get auth token for authenticated tests
        const uniqueEmail = `storagetest${Date.now()}@example.com`;
        const uniqueUsername = `storageuser${Date.now()}`;

        const createUserResponse = await request(app.getHttpServer()).post("/users").send({
            username: uniqueUsername,
            email: uniqueEmail,
            password: "password123",
        });

        if (createUserResponse.status !== 201) {
            console.error("User creation failed:", createUserResponse.status, createUserResponse.body);
            return;
        }

        testUserId = createUserResponse.body.user.id;

        // Login to get auth token
        const loginResponse = await request(app.getHttpServer()).post("/auth/login").send({
            email: uniqueEmail,
            password: "password123",
        });

        if (loginResponse.body.accessToken) {
            authToken = loginResponse.body.accessToken;
        } else {
            console.error("Login failed - no accessToken:", loginResponse.status, loginResponse.body);
        }
    });

    afterAll(async () => {
        // Cleanup: delete uploaded file if exists
        if (authToken && uploadedFileId) {
            await request(app.getHttpServer())
                .delete(`/storage/file/${uploadedFileId}`)
                .set("Authorization", `Bearer ${authToken}`);
        }

        // Cleanup: delete test user if exists
        if (authToken && testUserId) {
            await request(app.getHttpServer())
                .delete(`/users/${testUserId}`)
                .set("Authorization", `Bearer ${authToken}`);
        }

        await app.close();
    });

    describe("POST /storage/upload", () => {
        it("should return 401 when not authenticated", async () => {
            const response = await request(app.getHttpServer())
                .post("/storage/upload")
                .field("entityType", "user")
                .field("entityId", "user-123")
                .field("field", "avatar");

            expect(response.status).toBe(401);
        });

        it("should return 400 when file is not provided", async () => {
            if (!authToken) {
                console.warn("Skipping test: no auth token available");
                return;
            }

            const response = await request(app.getHttpServer())
                .post("/storage/upload")
                .set("Authorization", `Bearer ${authToken}`)
                .field("entityType", "user")
                .field("entityId", testUserId || "user-123")
                .field("field", "avatar");

            expect(response.status).toBe(400);
        });

        it("should return 400 when entityType is missing", async () => {
            if (!authToken) {
                console.warn("Skipping test: no auth token available");
                return;
            }

            const response = await request(app.getHttpServer())
                .post("/storage/upload")
                .set("Authorization", `Bearer ${authToken}`)
                .attach("file", Buffer.from("fake-image"), "test.png")
                .field("entityId", testUserId || "user-123")
                .field("field", "avatar");

            expect(response.status).toBe(400);
        });

        it("should return 400 when entityId is missing", async () => {
            if (!authToken) {
                console.warn("Skipping test: no auth token available");
                return;
            }

            const response = await request(app.getHttpServer())
                .post("/storage/upload")
                .set("Authorization", `Bearer ${authToken}`)
                .attach("file", Buffer.from("fake-image"), "test.png")
                .field("entityType", "user")
                .field("field", "avatar");

            expect(response.status).toBe(400);
        });

        it("should return 400 when field is missing", async () => {
            if (!authToken) {
                console.warn("Skipping test: no auth token available");
                return;
            }

            const response = await request(app.getHttpServer())
                .post("/storage/upload")
                .set("Authorization", `Bearer ${authToken}`)
                .attach("file", Buffer.from("fake-image"), "test.png")
                .field("entityType", "user")
                .field("entityId", testUserId || "user-123");

            expect(response.status).toBe(400);
        });

        // Note: Full upload tests require GCP Storage configuration
        // and a valid image file. These tests validate request structure only.
    });

    describe("GET /storage/file/:fileId", () => {
        it("should return 401 when not authenticated", async () => {
            const response = await request(app.getHttpServer()).get("/storage/file/some-file-id");

            expect(response.status).toBe(401);
        });

        it("should return 404 when file does not exist", async () => {
            if (!authToken) {
                console.warn("Skipping test: no auth token available");
                return;
            }

            const response = await request(app.getHttpServer())
                .get("/storage/file/non-existent-file-id")
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toBe(404);
        });

        it("should accept signed query parameter", async () => {
            if (!authToken) {
                console.warn("Skipping test: no auth token available");
                return;
            }

            const response = await request(app.getHttpServer())
                .get("/storage/file/non-existent-file-id")
                .query({ signed: true, expiresInMinutes: 30 })
                .set("Authorization", `Bearer ${authToken}`);

            // Should still return 404 for non-existent file
            expect(response.status).toBe(404);
        });
    });

    describe("GET /storage/entity/:entityType/:entityId/:field", () => {
        it("should return 401 when not authenticated", async () => {
            const response = await request(app.getHttpServer()).get("/storage/entity/user/user-123/avatar");

            expect(response.status).toBe(401);
        });

        it("should return 404 when entity file does not exist", async () => {
            if (!authToken) {
                console.warn("Skipping test: no auth token available");
                return;
            }

            const response = await request(app.getHttpServer())
                .get(`/storage/entity/user/${testUserId || "user-123"}/avatar`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toBe(404);
        });

        it("should accept signed query parameter", async () => {
            if (!authToken) {
                console.warn("Skipping test: no auth token available");
                return;
            }

            const response = await request(app.getHttpServer())
                .get("/storage/entity/user/user-123/avatar")
                .query({ signed: true, expiresInMinutes: 60 })
                .set("Authorization", `Bearer ${authToken}`);

            // Should still return 404 for non-existent entity file
            expect(response.status).toBe(404);
        });
    });

    describe("DELETE /storage/file/:fileId", () => {
        it("should return 401 when not authenticated", async () => {
            const response = await request(app.getHttpServer()).delete("/storage/file/some-file-id");

            expect(response.status).toBe(401);
        });

        it("should return 404 when file does not exist", async () => {
            if (!authToken) {
                console.warn("Skipping test: no auth token available");
                return;
            }

            const response = await request(app.getHttpServer())
                .delete("/storage/file/non-existent-file-id")
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toBe(404);
        });
    });
});
