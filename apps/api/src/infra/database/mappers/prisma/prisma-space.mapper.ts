import type { Space as PrismaSpace } from "@prisma/client";

export class PrismaSpaceMapper {
    static toResponse(raw: PrismaSpace) {
        return {
            id: raw.id,
            key: raw.key,
            name: raw.name,
            description: raw.description,
            createdAt: raw.createdAt.toISOString(),
            updatedAt: raw.updatedAt.toISOString(),
        };
    }
}
