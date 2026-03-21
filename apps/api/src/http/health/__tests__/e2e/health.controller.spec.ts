import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc, ZodValidationPipe } from "nestjs-zod";
import request from "supertest";

import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { ALLOWED_CORS_ORIGINS, AppModule } from "@/http/app.module";

const configureHttpSurface = (app: INestApplication) => {
    const allowedOrigins = new Set<string>(ALLOWED_CORS_ORIGINS);

    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }

            callback(null, allowedOrigins.has(origin));
        },
    });

    const swaggerConfig = new DocumentBuilder()
        .setTitle("Sardius API")
        .setDescription("DDD NestJS Backend API - Built with Sardius Template")
        .setVersion("1.0")
        .addBearerAuth(
            {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "Enter your JWT token",
            },
            "JWT-auth",
        )
        .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    const cleanedDocument = cleanupOpenApiDoc(document);

    SwaggerModule.setup("docs", app, cleanedDocument, {
        jsonDocumentUrl: "/docs.json",
    });
};

describe("HealthController (e2e)", () => {
    let app: INestApplication;

    afterEach(async () => {
        if (app) {
            await app.close();
        }
    });

    const createApp = async (options?: { degradeDb?: boolean }) => {
        const moduleBuilder = Test.createTestingModule({
            imports: [AppModule],
        });

        if (options?.degradeDb) {
            moduleBuilder.overrideProvider(PrismaService).useValue({
                $queryRaw: jest.fn().mockRejectedValue(new Error("database unavailable")),
            });
        }

        const moduleFixture: TestingModule = await moduleBuilder.compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ZodValidationPipe());
        configureHttpSurface(app);
        await app.init();
    };

    it("GET /health returns 200 with db up when database is reachable", async () => {
        await createApp();

        const response = await request(app.getHttpServer()).get("/health");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: "ok",
            db: "up",
        });
    });

    it("GET /health returns 503 with db down when database is unreachable", async () => {
        await createApp({ degradeDb: true });

        const response = await request(app.getHttpServer()).get("/health");

        expect(response.status).toBe(503);
        expect(response.body).toEqual({
            status: "degraded",
            db: "down",
        });
    });

    it("GET /docs returns an HTML documentation page", async () => {
        await createApp();

        const response = await request(app.getHttpServer()).get("/docs");

        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toContain("text/html");
        expect(response.text).toContain("<html");
    });

    it("includes ACAO header for http://localhost:3100", async () => {
        await createApp();

        const response = await request(app.getHttpServer()).get("/health").set("Origin", "http://localhost:3100");

        expect(response.status).toBe(200);
        expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3100");
    });

    it("does not include ACAO header for unknown origin", async () => {
        await createApp();

        const response = await request(app.getHttpServer()).get("/health").set("Origin", "http://evil.com");

        expect(response.status).toBe(200);
        expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    });
});
