export const DOCUMENT_CHUNK_REPOSITORY = "DocumentChunkRepository";

export interface DocumentChunkInput {
    sectionId: string;
    sectionTitle: string;
    content: string;
}

export interface DocumentChunkCreate extends DocumentChunkInput {
    documentId: string;
    spaceId: string;
    releaseVersionId: string;
    embedding: number[];
}

export interface DocumentChunkRepository {
    deleteByDocumentId(documentId: string): Promise<void>;
    createMany(chunks: DocumentChunkCreate[]): Promise<void>;
}
