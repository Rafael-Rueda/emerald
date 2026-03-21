import { Injectable } from "@nestjs/common";

import { SpacesRepository } from "@/domain/spaces/application/repositories/spaces.repository";
import { SpaceEntity } from "@/domain/spaces/enterprise/entities/space.entity";
import { PrismaSpaceMapper } from "@/infra/database/mappers/prisma/prisma-space.mapper";
import { PrismaService } from "@/infra/database/prisma/prisma.service";

@Injectable()
export class PrismaSpacesRepository implements SpacesRepository {
    constructor(private prisma: PrismaService) {}

    async findById(id: string): Promise<SpaceEntity | null> {
        const space = await this.prisma.space.findUnique({
            where: { id },
        });

        if (!space) {
            return null;
        }

        return PrismaSpaceMapper.toDomain(space);
    }

    async findByKey(key: string): Promise<SpaceEntity | null> {
        const space = await this.prisma.space.findUnique({
            where: { key },
        });

        if (!space) {
            return null;
        }

        return PrismaSpaceMapper.toDomain(space);
    }

    async list(): Promise<SpaceEntity[]> {
        const spaces = await this.prisma.space.findMany({
            orderBy: { createdAt: "asc" },
        });

        return spaces.map(PrismaSpaceMapper.toDomain);
    }

    async create(space: SpaceEntity): Promise<SpaceEntity> {
        const data = PrismaSpaceMapper.toPrisma(space);

        const created = await this.prisma.space.create({
            data,
        });

        return PrismaSpaceMapper.toDomain(created);
    }

    async update(space: SpaceEntity): Promise<SpaceEntity | null> {
        const data = PrismaSpaceMapper.toPrisma(space);

        try {
            const updated = await this.prisma.space.update({
                where: { id: space.id.toString() },
                data: {
                    key: data.key,
                    name: data.name,
                    description: data.description,
                },
            });

            return PrismaSpaceMapper.toDomain(updated);
        } catch {
            return null;
        }
    }

    async delete(spaceId: string): Promise<SpaceEntity | null> {
        try {
            const deleted = await this.prisma.space.delete({
                where: { id: spaceId },
            });

            return PrismaSpaceMapper.toDomain(deleted);
        } catch {
            return null;
        }
    }
}
