import { Module } from "@nestjs/common";

import { PrismaModule } from "./prisma.module";

import { DocumentsRepository } from "@/domain/documents/application/repositories/documents.repository";
import { CreateDocumentUseCase } from "@/domain/documents/application/use-cases/create-document.use-case";
import { CreateRevisionUseCase } from "@/domain/documents/application/use-cases/create-revision.use-case";
import { GetDocumentByIdUseCase } from "@/domain/documents/application/use-cases/get-document-by-id.use-case";
import { GetRevisionsUseCase } from "@/domain/documents/application/use-cases/get-revisions.use-case";
import { ListDocumentsUseCase } from "@/domain/documents/application/use-cases/list-documents.use-case";
import { PublishDocumentUseCase } from "@/domain/documents/application/use-cases/publish-document.use-case";
import { UpdateDocumentUseCase } from "@/domain/documents/application/use-cases/update-document.use-case";
import { PrismaDocumentsRepository } from "@/infra/database/repositories/prisma/prisma-documents.repository";

@Module({
    imports: [PrismaModule],
    providers: [
        {
            provide: "DocumentsRepository",
            useClass: PrismaDocumentsRepository,
        },
        {
            provide: "CreateDocumentUseCase",
            inject: ["DocumentsRepository"],
            useFactory: (documentsRepository: DocumentsRepository) => new CreateDocumentUseCase(documentsRepository),
        },
        {
            provide: "GetDocumentByIdUseCase",
            inject: ["DocumentsRepository"],
            useFactory: (documentsRepository: DocumentsRepository) => new GetDocumentByIdUseCase(documentsRepository),
        },
        {
            provide: "ListDocumentsUseCase",
            inject: ["DocumentsRepository"],
            useFactory: (documentsRepository: DocumentsRepository) => new ListDocumentsUseCase(documentsRepository),
        },
        {
            provide: "UpdateDocumentUseCase",
            inject: ["DocumentsRepository"],
            useFactory: (documentsRepository: DocumentsRepository) => new UpdateDocumentUseCase(documentsRepository),
        },
        {
            provide: "PublishDocumentUseCase",
            inject: ["DocumentsRepository"],
            useFactory: (documentsRepository: DocumentsRepository) => new PublishDocumentUseCase(documentsRepository),
        },
        {
            provide: "CreateRevisionUseCase",
            inject: ["DocumentsRepository"],
            useFactory: (documentsRepository: DocumentsRepository) => new CreateRevisionUseCase(documentsRepository),
        },
        {
            provide: "GetRevisionsUseCase",
            inject: ["DocumentsRepository"],
            useFactory: (documentsRepository: DocumentsRepository) => new GetRevisionsUseCase(documentsRepository),
        },
    ],
    exports: [
        "DocumentsRepository",
        "CreateDocumentUseCase",
        "GetDocumentByIdUseCase",
        "ListDocumentsUseCase",
        "UpdateDocumentUseCase",
        "PublishDocumentUseCase",
        "CreateRevisionUseCase",
        "GetRevisionsUseCase",
    ],
})
export class DocumentsSharedModule {}
