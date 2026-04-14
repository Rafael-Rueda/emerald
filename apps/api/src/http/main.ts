import { type INestApplication, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import { cleanupOpenApiDoc } from "nestjs-zod";

import {
    EMBEDDING_PROVIDER,
    type EmbeddingProvider,
} from "@/domain/ai-context/application/providers/embedding-provider";
import type { Env } from "@/env/env";
import { GlobalExceptionFilter } from "@/http/@shared/filters/global-exception.filter";
import { AppModule, parseCorsAllowedOrigins } from "@/http/app.module";
import { PrismaService } from "@/infra/database/prisma/prisma.service";

/**
 * Compares the injected embedding provider's dimension against the live
 * `document_chunks.embedding` column type. Emits a WARN (never throws) when
 * they diverge, with the remediation command.
 *
 * Silently ignored on any failure (DB not ready, table missing, etc).
 */
async function checkEmbeddingDimension(app: INestApplication): Promise<void> {
    const logger = new Logger("EmbeddingDimension");
    try {
        const provider = app.get<EmbeddingProvider>(EMBEDDING_PROVIDER);
        const prisma = app.get(PrismaService);

        const rows = await prisma.$queryRawUnsafe<Array<{ atttypmod: number }>>(
            `SELECT atttypmod FROM pg_attribute
             JOIN pg_class ON pg_class.oid = attrelid
             WHERE relname = 'document_chunks' AND attname = 'embedding'`,
        );

        if (rows.length === 0) {
            return;
        }

        const columnDim = Number(rows[0].atttypmod);

        if (columnDim !== provider.dimension) {
            logger.warn(
                `Mismatch: provider "${provider.name}" dim=${provider.dimension} but column vector(${columnDim}). ` +
                    `Run: pnpm --filter @emerald/api ai:dimension:apply && pnpm --filter @emerald/api ai:reindex`,
            );
        }
    } catch {
        // Intentionally silent — startup must not fail because of this check.
    }
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger:
            (process.env.LOG_LEVEL as Env["LOG_LEVEL"]) === "verbose"
                ? ["error", "warn", "log", "debug", "verbose"]
                : (process.env.LOG_LEVEL as Env["LOG_LEVEL"]) === "debug"
                  ? ["error", "warn", "log", "debug"]
                  : ["error", "warn", "log"],
    });

    const logger = new Logger("Bootstrap");

    // Global exception filter — catches all unhandled errors
    app.useGlobalFilters(new GlobalExceptionFilter());

    const configService = app.get<ConfigService<Env, true>>(ConfigService);

    const corsOriginsRaw = configService.get("CORS_ALLOWED_ORIGINS", { infer: true });
    const allowedOrigins = new Set<string>(parseCorsAllowedOrigins(corsOriginsRaw));

    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }

            callback(null, allowedOrigins.has(origin));
        },
    });

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
    const logLevel = configService.get("LOG_LEVEL", { infer: true });

    await app.listen(port);

    logger.log(`Application running on http://localhost:${port}`);
    logger.log(`Log level: ${logLevel}`);
    logger.log(`API docs: http://localhost:${port}/docs`);

    // Post-listen, non-blocking sanity check for embedding dimension coherence.
    void checkEmbeddingDimension(app);
}
bootstrap();
