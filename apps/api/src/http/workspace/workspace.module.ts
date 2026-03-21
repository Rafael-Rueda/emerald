import { Module } from "@nestjs/common";

import { DocumentsSharedModule } from "../@shared/modules/documents.module";
import { NavigationSharedModule } from "../@shared/modules/navigation.module";
import { VersionsSharedModule } from "../@shared/modules/versions.module";
import { DocumentsController } from "./controllers/documents.controller";
import { NavigationController } from "./controllers/navigation.controller";
import { RevisionsController } from "./controllers/revisions.controller";
import { VersionsController } from "./controllers/versions.controller";
import { DocumentsService } from "./services/documents.service";
import { NavigationService } from "./services/navigation.service";
import { VersionsService } from "./services/versions.service";

@Module({
    imports: [DocumentsSharedModule, NavigationSharedModule, VersionsSharedModule],
    controllers: [DocumentsController, RevisionsController, NavigationController, VersionsController],
    providers: [DocumentsService, NavigationService, VersionsService],
})
export class WorkspaceModule {}
