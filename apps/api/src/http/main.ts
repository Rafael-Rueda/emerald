import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import { cleanupOpenApiDoc } from "nestjs-zod";

import type { Env } from "@/env/env";
import { ALLOWED_CORS_ORIGINS, AppModule } from "@/http/app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

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

    const configService = app.get<ConfigService<Env, true>>(ConfigService);

    // Swagger/OpenAPI configuration
    const config = new DocumentBuilder()
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
        .addTag("Auth", "Authentication endpoints")
        .addTag("Users", "User management endpoints")
        .build();

    const document = SwaggerModule.createDocument(app, config);
    const cleanedDocument = cleanupOpenApiDoc(document);

    // Scalar API Reference UI (modern alternative to Swagger UI)
    app.use(
        "/docs",
        apiReference({
            content: cleanedDocument,
            theme: "mars",
        }),
    );

    // Also expose JSON spec for tools/clients
    SwaggerModule.setup("swagger", app, cleanedDocument, {
        jsonDocumentUrl: "/docs.json",
    });

    const port = configService.get("PORT", { infer: true });

    await app.listen(port);

    console.log(`Application running on: http://localhost:${port}`);
    console.log(`API Documentation (Scalar): http://localhost:${port}/docs`);
    console.log(`API Documentation (Swagger): http://localhost:${port}/swagger`);
    console.log(`OpenAPI JSON: http://localhost:${port}/docs.json`);
}
bootstrap();
