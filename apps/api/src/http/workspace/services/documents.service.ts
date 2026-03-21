import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { CreateDocumentUseCase } from "@/domain/documents/application/use-cases/create-document.use-case";
import { CreateRevisionUseCase } from "@/domain/documents/application/use-cases/create-revision.use-case";
import { GetDocumentByIdUseCase } from "@/domain/documents/application/use-cases/get-document-by-id.use-case";
import { GetRevisionsUseCase } from "@/domain/documents/application/use-cases/get-revisions.use-case";
import { ListDocumentsUseCase } from "@/domain/documents/application/use-cases/list-documents.use-case";
import { PublishDocumentUseCase } from "@/domain/documents/application/use-cases/publish-document.use-case";
import { UpdateDocumentUseCase } from "@/domain/documents/application/use-cases/update-document.use-case";
import { GetVersionByIdUseCase } from "@/domain/versions/application/use-cases/get-version-by-id.use-case";
import { DocumentPresenter, DocumentRevisionPresenter } from "@/http/workspace/presenters/document.presenter";
import {
    CreateDocumentBodyDTO,
    ListDocumentsQueryDTO,
    UpdateDocumentBodyDTO,
} from "@/http/workspace/schemas/documents.schema";
import { CreateRevisionBodyDTO } from "@/http/workspace/schemas/revisions.schema";

@Injectable()
export class DocumentsService {
    constructor(
        @Inject("CreateDocumentUseCase")
        private createDocumentUseCase: CreateDocumentUseCase,
        @Inject("GetDocumentByIdUseCase")
        private getDocumentByIdUseCase: GetDocumentByIdUseCase,
        @Inject("ListDocumentsUseCase")
        private listDocumentsUseCase: ListDocumentsUseCase,
        @Inject("UpdateDocumentUseCase")
        private updateDocumentUseCase: UpdateDocumentUseCase,
        @Inject("PublishDocumentUseCase")
        private publishDocumentUseCase: PublishDocumentUseCase,
        @Inject("CreateRevisionUseCase")
        private createRevisionUseCase: CreateRevisionUseCase,
        @Inject("GetRevisionsUseCase")
        private getRevisionsUseCase: GetRevisionsUseCase,
        @Inject("GetVersionByIdUseCase")
        private getVersionByIdUseCase: GetVersionByIdUseCase,
    ) {}

    async create(body: CreateDocumentBodyDTO, userId: string) {
        const result = await this.createDocumentUseCase.execute({
            spaceId: body.spaceId,
            releaseVersionId: body.releaseVersionId,
            title: body.title,
            slug: body.slug,
            contentJson: body.content_json,
            createdBy: userId,
        });

        if (result.isLeft()) {
            const error = result.value;

            if (error.name === "DocumentSlugAlreadyExistsError") {
                throw new ConflictException(error.message);
            }

            throw new BadRequestException(error.message);
        }

        return DocumentPresenter.toHTTP(result.value.document);
    }

    async findAll(query: ListDocumentsQueryDTO) {
        const result = await this.listDocumentsUseCase.execute({
            spaceId: query.spaceId,
            page: query.page,
            limit: query.limit,
        });

        return {
            documents: result.value.documents.map((document) => DocumentPresenter.toSummaryHTTP(document)),
            total: result.value.total,
            page: query.page,
            limit: query.limit,
        };
    }

    async findOne(documentId: string) {
        const result = await this.getDocumentByIdUseCase.execute({ documentId });

        if (result.isLeft()) {
            throw new NotFoundException(result.value.message);
        }

        return DocumentPresenter.toHTTP(result.value.document);
    }

    async update(documentId: string, body: UpdateDocumentBodyDTO, userId: string) {
        const result = await this.updateDocumentUseCase.execute({
            documentId,
            updatedBy: userId,
            title: body.title,
            contentJson: body.content_json,
        });

        if (result.isLeft()) {
            const error = result.value;

            if (error.name === "DocumentNotFoundError") {
                throw new NotFoundException(error.message);
            }

            throw new BadRequestException(error.message);
        }

        return DocumentPresenter.toHTTP(result.value.document);
    }

    async publish(documentId: string, userId: string) {
        const result = await this.publishDocumentUseCase.execute({
            documentId,
            updatedBy: userId,
        });

        if (result.isLeft()) {
            const error = result.value;

            if (error.name === "DocumentNotFoundError") {
                throw new NotFoundException(error.message);
            }

            throw new BadRequestException(error.message);
        }

        const publishedDocument = result.value.document;
        const releaseVersion = await this.getVersionByIdUseCase.execute({
            versionId: publishedDocument.releaseVersionId,
        });

        if (!releaseVersion.isLeft()) {
            await this.revalidatePublicDocumentPath({
                space: publishedDocument.spaceKey,
                version: releaseVersion.value.version.key,
                slug: publishedDocument.slug,
            });
        }

        return DocumentPresenter.toHTTP(publishedDocument);
    }

    async createRevision(documentId: string, body: CreateRevisionBodyDTO, userId: string) {
        const result = await this.createRevisionUseCase.execute({
            documentId,
            contentJson: body.content_json,
            createdBy: userId,
            changeNote: body.changeNote,
        });

        if (result.isLeft()) {
            const error = result.value;

            if (error.name === "DocumentNotFoundError") {
                throw new NotFoundException(error.message);
            }

            throw new BadRequestException(error.message);
        }

        return DocumentRevisionPresenter.toHTTP(result.value.revision);
    }

    async getRevisions(documentId: string) {
        const result = await this.getRevisionsUseCase.execute({ documentId });

        if (result.isLeft()) {
            const error = result.value;

            if (error.name === "DocumentNotFoundError") {
                throw new NotFoundException(error.message);
            }

            throw new BadRequestException(error.message);
        }

        const revisions = result.value.revisions.map((revision) => DocumentRevisionPresenter.toHTTP(revision));

        return {
            revisions,
            total: revisions.length,
        };
    }

    private async revalidatePublicDocumentPath(identity: { space: string; version: string; slug: string }) {
        const docsAppUrl = (process.env.DOCS_APP_URL ?? "http://localhost:3100").trim().replace(/\/+$/, "");
        const revalidateSecret = (process.env.DOCS_REVALIDATE_SECRET ?? "emerald-local-revalidate-secret").trim();

        const path = `/${identity.space}/${identity.version}/${identity.slug}`;

        try {
            const response = await fetch(`${docsAppUrl}/api/revalidate`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-revalidate-secret": revalidateSecret,
                },
                body: JSON.stringify({ path }),
            });

            if (!response.ok) {
                console.warn(
                    `[documents.publish] public docs revalidation failed for ${path}: ${response.status}`,
                );
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.warn(`[documents.publish] unable to revalidate public docs path ${path}: ${errorMessage}`);
        }
    }
}
