import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./auth/auth.module";
import { StorageModule } from "./storage/storage.module";
import { UsersModule } from "./users/users.module";
import { WorkspaceModule } from "./workspace/workspace.module";

import { validateEnv } from "@/env/env";

@Module({
    imports: [
        ConfigModule.forRoot({
            validate: (env) => validateEnv(),
            isGlobal: true,
        }),
        AuthModule,
        UsersModule,
        StorageModule,
        WorkspaceModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
