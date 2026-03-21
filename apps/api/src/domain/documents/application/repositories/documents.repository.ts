import type { DocumentContent } from "@emerald/contracts";

import { DocumentEntity } from "../../enterprise/entities/document.entity";
import { DocumentRevisionEntity } from "../../enterprise/entities/document-revision.entity";

export interface ListDocumentsParams {
    spaceId: string;
    page: number;
    limit: number;
}

export interface ListDocumentsResult {
    documents: DocumentEntity[];
    total: number;
}

export interface CreateDocumentParams {
    spaceId: string;
    releaseVersionId: string;
    title: string;
    slug: string;
    contentJson: DocumentContent;
    createdBy: string;
}

export interface UpdateDocumentParams {
    documentId: string;
    updatedBy: string;
    title?: string;
    contentJson?: DocumentContent;
}

export interface CreateRevisionParams {
    documentId: string;
    contentJson: DocumentContent;
    createdBy: string;
    changeNote?: string;
}

export interface FindBySlugParams {
    spaceId: string;
    slug: string;
    releaseVersionId: string;
}

export interface DocumentsRepository {
    findById(id: string): Promise<DocumentEntity | null>;
    findBySlugInVersion(params: FindBySlugParams): Promise<DocumentEntity | null>;
    listBySpaceId(params: ListDocumentsParams): Promise<ListDocumentsResult>;
    create(params: CreateDocumentParams): Promise<DocumentEntity>;
    update(params: UpdateDocumentParams): Promise<DocumentEntity | null>;
    publish(documentId: string, updatedBy: string): Promise<DocumentEntity | null>;
    createRevision(params: CreateRevisionParams): Promise<DocumentRevisionEntity | null>;
    findRevisions(documentId: string): Promise<DocumentRevisionEntity[]>;
}
