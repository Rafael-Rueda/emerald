import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import type {
    DocumentChunkCreate,
    DocumentChunkRepository,
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

    async createMany(chunks: DocumentChunkCreate[]): Promise<void> {
        if (chunks.length === 0) {
            return;
        }

        const values = Prisma.join(
            chunks.map((chunk) => {
                const embedding = `[${chunk.embedding.join(",")}]`;

                return Prisma.sql`(
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
