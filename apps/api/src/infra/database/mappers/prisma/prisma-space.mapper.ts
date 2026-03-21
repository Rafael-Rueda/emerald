import { Prisma, type Space as PrismaSpace } from "@prisma/client";

import { SpaceEntity } from "@/domain/spaces/enterprise/entities/space.entity";

export class PrismaSpaceMapper {
    static toDomain(raw: PrismaSpace): SpaceEntity {
        const space = SpaceEntity.create(
            {
                key: raw.key,
                name: raw.name,
                description: raw.description,
            },
            raw.id,
        );

        space.createdAt = raw.createdAt;
        space.updatedAt = raw.updatedAt;

        return space;
    }

    static toPrisma(space: SpaceEntity): Prisma.SpaceUncheckedCreateInput {
        return {
            id: space.id.toString(),
            key: space.key,
            name: space.name,
            description: space.description,
        };
    }

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
