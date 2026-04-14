import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { RequestLoggerMiddleware } from "./@shared/middleware/request-logger.middleware";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { McpModule } from "./mcp/mcp.module";
import { PublicModule } from "./public/public.module";
import { StorageModule } from "./storage/storage.module";
import { UsersModule } from "./users/users.module";
import { SpacesModule } from "./workspace/spaces.module";
import { WorkspaceModule } from "./workspace/workspace.module";

import { validateEnv } from "@/env/env";

/**
 * @deprecated Use the `CORS_ALLOWED_ORIGINS` environment variable instead.
 * Kept for backward compatibility with tests and legacy imports.
 * Source of truth for runtime CORS origins is now `env.CORS_ALLOWED_ORIGINS`
 * (comma-separated string) read in `main.ts` via `ConfigService`.
 */
export const ALLOWED_CORS_ORIGINS = [
    "http://localhost:3001",
    "http://localhost:3000",
    "http://localhost:3100",
    "http://localhost:3101",
] as const;

/**
 * Parses the `CORS_ALLOWED_ORIGINS` comma-separated string into a trimmed,
 * filtered array of origin URLs. Exposed for use by `main.ts` and tests.
 */
export function parseCorsAllowedOrigins(raw: string | undefined | null): string[] {
    if (!raw) return [];
    return raw
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);
}

@Module({
    imports: [
        ConfigModule.forRoot({
            validate: (env) => validateEnv(),
            isGlobal: true,
        }),
        AuthModule,
        HealthModule,
        McpModule,
        PublicModule,
        UsersModule,
        StorageModule,
        SpacesModule,
        WorkspaceModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestLoggerMiddleware).forRoutes("*");
    }
}
