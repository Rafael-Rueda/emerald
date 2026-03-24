import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ROLES } from "@prisma/client";
import bcrypt from "bcryptjs";
import { fileTypeFromBuffer } from "file-type";
import { ZodValidationPipe } from "nestjs-zod";
import request from "supertest";

import type { IStorageProvider } from "@/domain/storage/application/providers/storage.provider";
import { AppModule } from "@/http/app.module";
import { PrismaService } from "@/infra/database/prisma/prisma.service";

describe("StorageController (e2e)", () => {
    let app: INestApplication;
    let prismaService: PrismaService;
    let authToken: string;
    let superAdminId: string;

    const fileTypeFromBufferMock = jest.mocked(fileTypeFromBuffer);

    const storageProviderMock: jest.Mocked<IStorageProvider> = {
        uploadStream: jest.fn(),
        uploadBuffer: jest.fn(),
        delete: jest.fn(),
        exists: jest.fn(),
        getSignedUrl: jest.fn(),
        getPublicUrl: jest.fn(),
        copy: jest.fn(),
    };

    const pngBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2qkYsAAAAASUVORK5CYII=",
        "base64",
    );

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider("StorageProvider")
            .useValue(storageProviderMock)
            .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ZodValidationPipe());
        await app.init();

        prismaService = app.get(PrismaService);

        const passwordHash = await bcrypt.hash("password123", 10);

        const superAdmin = await prismaService.user.upsert({
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

        superAdminId = superAdmin.id;

        const loginResponse = await request(app.getHttpServer()).post("/auth/login").send({
            email: "admin@test.com",
            password: "password123",
        });

        expect(loginResponse.status).toBe(200);
        authToken = loginResponse.body.accessToken as string;
    });

    beforeEach(() => {
        jest.clearAllMocks();

        fileTypeFromBufferMock.mockResolvedValue({
            ext: "png",
            mime: "image/png",
        });

        storageProviderMock.uploadStream.mockImplementation(async (_stream, options) => ({
            path: options.path,
            publicUrl: `https://storage.googleapis.com/test-bucket/${options.path}`,
            size: pngBuffer.length,
        }));

        storageProviderMock.getPublicUrl.mockImplementation(
            (path: string) => `https://storage.googleapis.com/test-bucket/${path}`,
        );
    });

    afterAll(async () => {
        await prismaService.file.deleteMany({
            where: {
                entityType: "user",
                entityId: superAdminId,
                field: "avatar",
            },
        });

        await app.close();
    });

    describe("POST /api/storage/upload", () => {
        it("returns 201 and a GCP URL for a valid image upload", async () => {
            const response = await request(app.getHttpServer())
                .post("/api/storage/upload")
                .set("Authorization", `Bearer ${authToken}`)
                .attach("file", pngBuffer, "avatar.png")
                .field("entityType", "user")
                .field("entityId", superAdminId)
                .field("field", "avatar");

            expect(response.status).toBe(201);
            expect(response.body).toEqual(
                expect.objectContaining({
                    url: expect.stringMatching(/^https:\/\/storage\.googleapis\.com\//),
                }),
            );
        });

        it("returns 400 when file is not provided", async () => {
            const response = await request(app.getHttpServer())
                .post("/api/storage/upload")
                .set("Authorization", `Bearer ${authToken}`)
                .field("entityType", "user")
                .field("entityId", superAdminId)
                .field("field", "avatar");

            expect(response.status).toBe(400);
        });

        it("returns 400 for invalid MIME types", async () => {
            fileTypeFromBufferMock.mockResolvedValueOnce({
                ext: "js" as never,
                mime: "application/javascript",
            });

            const response = await request(app.getHttpServer())
                .post("/api/storage/upload")
                .set("Authorization", `Bearer ${authToken}`)
                .attach("file", Buffer.from("console.log('not-an-image');"), "malicious.js")
                .field("entityType", "user")
                .field("entityId", superAdminId)
                .field("field", "avatar");

            expect(response.status).toBe(400);
            expect(JSON.stringify(response.body.message)).toContain("not allowed");
        });

        it("returns 400 for oversized uploads", async () => {
            const oversizedImageBuffer = Buffer.alloc(11 * 1024 * 1024, 0xff);

            fileTypeFromBufferMock.mockResolvedValueOnce({
                ext: "png",
                mime: "image/png",
            });

            const response = await request(app.getHttpServer())
                .post("/api/storage/upload")
                .set("Authorization", `Bearer ${authToken}`)
                .attach("file", oversizedImageBuffer, "large.png")
                .field("entityType", "user")
                .field("entityId", superAdminId)
                .field("field", "avatar");

            expect(response.status).toBe(400);
            expect(JSON.stringify(response.body.message)).toContain("exceeds maximum allowed size");
        });
    });
});
