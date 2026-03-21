import { Injectable } from "@nestjs/common";
import { ReleaseVersionStatus } from "@prisma/client";

import {
    CreateReleaseVersionParams,
    ReleaseVersionsRepository,
} from "@/domain/versions/application/repositories/release-versions.repository";
import { ReleaseVersionEntity } from "@/domain/versions/enterprise/entities/release-version.entity";
import { PrismaReleaseVersionMapper } from "@/infra/database/mappers/prisma/prisma-release-version.mapper";
import { PrismaService } from "@/infra/database/prisma/prisma.service";

@Injectable()
export class PrismaReleaseVersionsRepository implements ReleaseVersionsRepository {
    constructor(private prisma: PrismaService) {}

    async findById(id: string): Promise<ReleaseVersionEntity | null> {
        const version = await this.prisma.releaseVersion.findUnique({
            where: { id },
        });

        if (!version) {
            return null;
        }

        return PrismaReleaseVersionMapper.toDomain(version);
    }

    async findByKeyInSpace(spaceId: string, key: string): Promise<ReleaseVersionEntity | null> {
        const version = await this.prisma.releaseVersion.findUnique({
            where: {
                spaceId_key: {
                    spaceId,
                    key,
                },
            },
        });

        if (!version) {
            return null;
        }

        return PrismaReleaseVersionMapper.toDomain(version);
    }

    async listBySpaceId(spaceId: string): Promise<ReleaseVersionEntity[]> {
        const versions = await this.prisma.releaseVersion.findMany({
            where: { spaceId },
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        });

        return versions.map((version) => PrismaReleaseVersionMapper.toDomain(version));
    }

    async create(params: CreateReleaseVersionParams): Promise<ReleaseVersionEntity> {
        const version = await this.prisma.releaseVersion.create({
            data: {
                spaceId: params.spaceId,
                key: params.key,
                label: params.label,
                status: ReleaseVersionStatus.DRAFT,
                isDefault: false,
            },
        });

        return PrismaReleaseVersionMapper.toDomain(version);
    }

    async publish(versionId: string): Promise<ReleaseVersionEntity | null> {
        try {
            const version = await this.prisma.releaseVersion.update({
                where: { id: versionId },
                data: {
                    status: ReleaseVersionStatus.PUBLISHED,
                    publishedAt: new Date(),
                },
            });

            return PrismaReleaseVersionMapper.toDomain(version);
        } catch {
            return null;
        }
    }

    async setDefault(versionId: string): Promise<ReleaseVersionEntity | null> {
        const targetVersion = await this.prisma.releaseVersion.findUnique({
            where: { id: versionId },
            select: { id: true, spaceId: true },
        });

        if (!targetVersion) {
            return null;
        }

        try {
            const version = await this.prisma.$transaction(async (tx) => {
                await tx.releaseVersion.updateMany({
                    where: {
                        spaceId: targetVersion.spaceId,
                        id: {
                            not: targetVersion.id,
                        },
                    },
                    data: {
                        isDefault: false,
                    },
                });

                return tx.releaseVersion.update({
                    where: {
                        id: targetVersion.id,
                    },
                    data: {
                        isDefault: true,
                    },
                });
            });

            return PrismaReleaseVersionMapper.toDomain(version);
        } catch {
            return null;
        }
    }

    async archive(versionId: string): Promise<ReleaseVersionEntity | null> {
        try {
            const version = await this.prisma.releaseVersion.update({
                where: { id: versionId },
                data: {
                    status: ReleaseVersionStatus.ARCHIVED,
                    isDefault: false,
                },
            });

            return PrismaReleaseVersionMapper.toDomain(version);
        } catch {
            return null;
        }
    }
}
