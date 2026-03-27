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

export interface DocumentChunkRecord {
    id: string;
    documentId: string;
    spaceId: string;
    releaseVersionId: string;
    sectionId: string;
    sectionTitle: string;
    content: string;
    createdAt: Date;
}

export interface DocumentChunkStats {
    documentId: string;
    chunkCount: number;
    lastEmbeddedAt: Date | null;
}

export interface DocumentChunkRepository {
    deleteByDocumentId(documentId: string): Promise<void>;
    createMany(chunks: DocumentChunkCreate[]): Promise<void>;
    findByDocumentId(documentId: string): Promise<DocumentChunkRecord[]>;
    getStatsBySpaceId(spaceId: string): Promise<DocumentChunkStats[]>;
}
