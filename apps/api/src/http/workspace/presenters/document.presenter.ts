import { DocumentEntity } from "@/domain/documents/enterprise/entities/document.entity";
import { DocumentRevisionEntity } from "@/domain/documents/enterprise/entities/document-revision.entity";

export class DocumentPresenter {
    static toHTTP(document: DocumentEntity) {
        return {
            id: document.id.toString(),
            title: document.title,
            slug: document.slug,
            space: document.spaceKey,
            spaceId: document.spaceId,
            releaseVersionId: document.releaseVersionId,
            status: document.status,
            content_json: document.currentContentJson,
            currentRevisionId: document.currentRevisionId,
            createdBy: document.createdBy,
            updatedBy: document.updatedBy,
            createdAt: document.createdAt.toISOString(),
            updatedAt: document.updatedAt.toISOString(),
        };
    }

    static toSummaryHTTP(document: DocumentEntity) {
        return {
            id: document.id.toString(),
            title: document.title,
            slug: document.slug,
            space: document.spaceKey,
            spaceId: document.spaceId,
            releaseVersionId: document.releaseVersionId,
            status: document.status,
            updatedAt: document.updatedAt.toISOString(),
        };
    }
}

export class DocumentRevisionPresenter {
    static toHTTP(revision: DocumentRevisionEntity) {
        return {
            id: revision.id.toString(),
            documentId: revision.documentId,
            revisionNumber: revision.revisionNumber,
            content_json: revision.contentJson,
            createdBy: revision.createdBy,
            changeNote: revision.changeNote,
            createdAt: revision.createdAt.toISOString(),
        };
    }
}
