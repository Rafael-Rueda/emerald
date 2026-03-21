import { Module } from "@nestjs/common";

import { PrismaModule } from "@/http/@shared/modules/prisma.module";
import { PublicController } from "@/http/public/controllers/public.controller";
import { PublicService } from "@/http/public/services/public.service";

@Module({
    imports: [PrismaModule],
    controllers: [PublicController],
    providers: [PublicService],
})
export class PublicModule {}
