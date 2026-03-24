import { Inject, Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";

import { ROLES } from "@/domain/identity/enterprise/entities/user.entity";
import { CreateUserUseCase } from "@/domain/identity/application/use-cases/create-user.use-case";
import { PrismaService } from "@/infra/database/prisma/prisma.service";

const DEFAULT_ADMIN_EMAIL = "admin@emerald.local";
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin1234";

@Injectable()
export class DefaultAdminSeederService implements OnApplicationBootstrap {
    private readonly logger = new Logger(DefaultAdminSeederService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject("CreateUserUseCase")
        private readonly createUserUseCase: CreateUserUseCase,
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        await this.seedDefaultAdminIfNeeded();
    }

    async seedDefaultAdminIfNeeded(): Promise<void> {
        const userCount = await this.prisma.user.count();

        if (userCount > 0) {
            return;
        }

        this.logger.warn("No users found in database. Creating default admin user...");

        const result = await this.createUserUseCase.execute({
            username: DEFAULT_ADMIN_USERNAME,
            email: DEFAULT_ADMIN_EMAIL,
            passwordHash: DEFAULT_ADMIN_PASSWORD,
            roles: [ROLES.SUPER_ADMIN],
            admin: true,
        });

        if (result.isLeft()) {
            this.logger.error("Failed to create default admin user", {
                error: result.value.message,
            });
            return;
        }

        this.logger.warn(
            `Default admin user created — email: ${DEFAULT_ADMIN_EMAIL}, password: ${DEFAULT_ADMIN_PASSWORD}. Change these credentials immediately.`,
        );
    }
}
