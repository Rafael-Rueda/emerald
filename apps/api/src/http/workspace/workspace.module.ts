import { Module } from "@nestjs/common";

import { DocumentsSharedModule } from "../@shared/modules/documents.module";
import { DocumentsController } from "./controllers/documents.controller";
import { NavigationController } from "./controllers/navigation.controller";
import { RevisionsController } from "./controllers/revisions.controller";
import { DocumentsService } from "./services/documents.service";
import { NavigationService } from "./services/navigation.service";
import { NavigationSharedModule } from "../@shared/modules/navigation.module";

@Module({
    imports: [DocumentsSharedModule, NavigationSharedModule],
    controllers: [DocumentsController, RevisionsController, NavigationController],
    providers: [DocumentsService, NavigationService],
})
export class WorkspaceModule {}
