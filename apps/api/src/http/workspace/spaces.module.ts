import { Module } from "@nestjs/common";

import { SpacesSharedModule } from "../@shared/modules/spaces.module";
import { SpacesController } from "./controllers/spaces.controller";
import { SpacesService } from "./services/spaces.service";

@Module({
    imports: [SpacesSharedModule],
    controllers: [SpacesController],
    providers: [SpacesService],
})
export class SpacesModule {}
