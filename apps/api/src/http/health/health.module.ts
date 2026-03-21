import { Module } from "@nestjs/common";

import { PrismaModule } from "@/http/@shared/modules/prisma.module";
import { HealthController } from "@/http/health/controllers/health.controller";

@Module({
    imports: [PrismaModule],
    controllers: [HealthController],
})
export class HealthModule {}
