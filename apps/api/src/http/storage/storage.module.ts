import { Module } from "@nestjs/common";

import { StorageSharedModule } from "../@shared/modules/storage.module";
import { StorageController } from "./controllers/storage.controller";
import { StorageService } from "./services/storage.service";

@Module({
    imports: [StorageSharedModule],
    controllers: [StorageController],
    providers: [StorageService],
})
export class StorageModule {}
