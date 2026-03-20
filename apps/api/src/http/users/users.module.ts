import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { IdentityModule } from "../@shared/modules/identity.module";
import { StorageSharedModule } from "../@shared/modules/storage.module";
import { AuthGuard } from "../auth/guards/auth.guard";
import { UsersController } from "./controllers/users.controller";
import { UsersService } from "./services/users.service";

@Module({
    imports: [IdentityModule, StorageSharedModule],
    controllers: [UsersController],
    providers: [
        UsersService,
        {
            provide: APP_GUARD,
            useClass: AuthGuard,
        },
    ],
})
export class UsersModule {}
