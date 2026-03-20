import { Module } from "@nestjs/common";

import { WorkspaceDocumentsController } from "./controllers/workspace-documents.controller";

@Module({
    controllers: [WorkspaceDocumentsController],
})
export class WorkspaceModule {}
