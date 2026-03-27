import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import * as pgvector from "pgvector";

import type {
    DocumentChunkCreate,
    DocumentChunkRecord,
    DocumentChunkRepository,
    DocumentChunkStats,
} from "@/domain/ai-context/application/repositories/document-chunk.repository";
import { PrismaService } from "@/infra/database/prisma/prisma.service";

@Injectable()
export class PrismaDocumentChunkRepository implements DocumentChunkRepository {
    constructor(private readonly prisma: PrismaService) {}

    async deleteByDocumentId(documentId: string): Promise<void> {
        await this.prisma.documentChunk.deleteMany({
            where: { documentId },
        });
    }

    async findByDocumentId(documentId: string): Promise<DocumentChunkRecord[]> {
        const chunks = await this.prisma.documentChunk.findMany({
            where: { documentId },
            select: {
                id: true,
                documentId: true,
                spaceId: true,
                releaseVersionId: true,
                sectionId: true,
                sectionTitle: true,
                content: true,
                createdAt: true,
            },
            orderBy: { createdAt: "asc" },
        });

        return chunks;
    }

    async getStatsBySpaceId(spaceId: string): Promise<DocumentChunkStats[]> {
        const rows = await this.prisma.$queryRaw<
            Array<{ document_id: string; chunk_count: bigint; last_embedded_at: Date | null }>
        >`
            SELECT
                dc.document_id,
                COUNT(*)::bigint AS chunk_count,
                MAX(dc.created_at) AS last_embedded_at
            FROM document_chunks dc
            WHERE dc.space_id = ${spaceId}
            GROUP BY dc.document_id
        `;

        return rows.map((row) => ({
            documentId: row.document_id,
            chunkCount: Number(row.chunk_count),
            lastEmbeddedAt: row.last_embedded_at,
        }));
    }

    async createMany(chunks: DocumentChunkCreate[]): Promise<void> {
        if (chunks.length === 0) {
            return;
        }

        const values = Prisma.join(
            chunks.map((chunk) => {
                const embedding = pgvector.toSql(chunk.embedding);
                const chunkId = randomUUID();

                return Prisma.sql`(
                    ${chunkId},
                    ${chunk.documentId},
                    ${chunk.spaceId},
                    ${chunk.releaseVersionId},
                    ${chunk.sectionId},
                    ${chunk.sectionTitle},
                    ${chunk.content},
                    ${embedding}::vector
                )`;
            }),
        );

        await this.prisma.$executeRaw`
            INSERT INTO "document_chunks" (
                "id",
                "document_id",
                "space_id",
                "release_version_id",
                "section_id",
                "section_title",
                "content",
                "embedding"
            ) VALUES ${values}
        `;
    }
}
