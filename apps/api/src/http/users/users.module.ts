import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { IdentityModule } from "../@shared/modules/identity.module";
import { PrismaModule } from "../@shared/modules/prisma.module";
import { DefaultAdminSeederService } from "../@shared/services/default-admin-seeder.service";
import { StorageSharedModule } from "../@shared/modules/storage.module";
import { AuthGuard } from "../auth/guards/auth.guard";
import { UsersController } from "./controllers/users.controller";
import { UsersService } from "./services/users.service";

@Module({
    imports: [IdentityModule, StorageSharedModule, PrismaModule],
    controllers: [UsersController],
    providers: [
        UsersService,
        DefaultAdminSeederService,
        {
            provide: APP_GUARD,
            useClass: AuthGuard,
        },
    ],
})
export class UsersModule {}
