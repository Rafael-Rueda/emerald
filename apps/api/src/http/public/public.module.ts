import { Module } from "@nestjs/common";

import { AiContextModule } from "@/http/@shared/modules/ai-context.module";
import { PrismaModule } from "@/http/@shared/modules/prisma.module";
import { AiContextController } from "@/http/public/controllers/ai-context.controller";
import { PublicController } from "@/http/public/controllers/public.controller";
import { PublicService } from "@/http/public/services/public.service";

@Module({
    imports: [PrismaModule, AiContextModule],
    controllers: [PublicController, AiContextController],
    providers: [PublicService],
})
export class PublicModule {}
