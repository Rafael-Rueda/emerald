import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { McpModule } from "./mcp/mcp.module";
import { PublicModule } from "./public/public.module";
import { StorageModule } from "./storage/storage.module";
import { UsersModule } from "./users/users.module";
import { SpacesModule } from "./workspace/spaces.module";
import { WorkspaceModule } from "./workspace/workspace.module";

import { validateEnv } from "@/env/env";

export const ALLOWED_CORS_ORIGINS = ["http://localhost:3100", "http://localhost:3101"] as const;

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
export class AppModule {}
