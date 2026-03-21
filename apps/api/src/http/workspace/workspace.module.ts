import { Module } from "@nestjs/common";

import { DocumentsSharedModule } from "../@shared/modules/documents.module";
import { DocumentsController } from "./controllers/documents.controller";
import { RevisionsController } from "./controllers/revisions.controller";
import { DocumentsService } from "./services/documents.service";

@Module({
    imports: [DocumentsSharedModule],
    controllers: [DocumentsController, RevisionsController],
    providers: [DocumentsService],
})
export class WorkspaceModule {}
