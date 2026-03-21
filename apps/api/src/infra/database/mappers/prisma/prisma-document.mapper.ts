import type { DocumentContent } from "@emerald/contracts";
import type {
    Document as PrismaDocument,
    DocumentRevision as PrismaDocumentRevision,
    DocumentStatus as PrismaDocumentStatus,
    ReleaseVersion as PrismaReleaseVersion,
    Space as PrismaSpace,
} from "@prisma/client";

import {
    DOCUMENT_STATUS,
    DocumentEntity,
    type DocumentStatus,
} from "@/domain/documents/enterprise/entities/document.entity";
import { DocumentRevisionEntity } from "@/domain/documents/enterprise/entities/document-revision.entity";

type WorkspaceDocumentStatus = "published" | "draft" | "archived";

type DocumentWithSpace = PrismaDocument & {
    space: PrismaSpace;
    currentRevision?: PrismaDocumentRevision | null;
};

type PublicDocumentWithRelations = DocumentWithSpace & {
    releaseVersion: PrismaReleaseVersion;
};

export class PrismaDocumentMapper {
    static toDomain(raw: DocumentWithSpace): DocumentEntity {
        const document = DocumentEntity.create(
            {
                spaceId: raw.spaceId,
                spaceKey: raw.space.key,
                releaseVersionId: raw.releaseVersionId,
                title: raw.title,
                slug: raw.slug,
                status: this.fromPrismaStatus(raw.status),
                currentRevisionId: raw.currentRevisionId,
                currentContentJson: (raw.currentRevision?.contentJson as DocumentContent | null) ?? null,
                createdBy: raw.createdBy,
                updatedBy: raw.updatedBy,
            },
            raw.id,
        );

        document.createdAt = raw.createdAt;
        document.updatedAt = raw.updatedAt;

        return document;
    }

    static toRevisionDomain(raw: PrismaDocumentRevision): DocumentRevisionEntity {
        const revision = DocumentRevisionEntity.create(
            {
                documentId: raw.documentId,
                revisionNumber: raw.revisionNumber,
                contentJson: raw.contentJson as DocumentContent,
                createdBy: raw.createdBy,
                changeNote: raw.changeNote,
            },
            raw.id,
        );

        revision.createdAt = raw.createdAt;
        revision.updatedAt = raw.createdAt;

        return revision;
    }

    static toWorkspaceDocument(raw: DocumentWithSpace) {
        return {
            id: raw.id,
            title: raw.title,
            slug: raw.slug,
            space: raw.space.key,
            status: this.toWorkspaceStatus(raw.status),
            updatedAt: raw.updatedAt.toISOString(),
        };
    }

    static toDocumentResponse(raw: PublicDocumentWithRelations) {
        return {
            document: {
                id: raw.id,
                title: raw.title,
                slug: raw.slug,
                space: raw.space.key,
                version: raw.releaseVersion.key,
                body: raw.currentRevision?.renderedHtml ?? "",
                headings: [],
                updatedAt: raw.updatedAt.toISOString(),
            },
        };
    }

    static toPrismaStatus(status: DocumentStatus): PrismaDocumentStatus {
        const statusMap: Record<DocumentStatus, PrismaDocumentStatus> = {
            [DOCUMENT_STATUS.DRAFT]: "DRAFT",
            [DOCUMENT_STATUS.PUBLISHED]: "PUBLISHED",
            [DOCUMENT_STATUS.ARCHIVED]: "ARCHIVED",
        };

        return statusMap[status];
    }

    private static fromPrismaStatus(status: PrismaDocumentStatus): DocumentStatus {
        const statusMap: Record<PrismaDocumentStatus, DocumentStatus> = {
            DRAFT: DOCUMENT_STATUS.DRAFT,
            PUBLISHED: DOCUMENT_STATUS.PUBLISHED,
            ARCHIVED: DOCUMENT_STATUS.ARCHIVED,
        };

        return statusMap[status];
    }

    private static toWorkspaceStatus(status: PrismaDocumentStatus): WorkspaceDocumentStatus {
        return this.fromPrismaStatus(status) as WorkspaceDocumentStatus;
    }
}
