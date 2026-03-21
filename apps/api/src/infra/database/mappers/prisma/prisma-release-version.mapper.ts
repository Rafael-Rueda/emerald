import type {
    ReleaseVersion as PrismaReleaseVersion,
    ReleaseVersionStatus as PrismaReleaseVersionStatus,
} from "@prisma/client";

import {
    RELEASE_VERSION_STATUS,
    ReleaseVersionEntity,
    type ReleaseVersionStatus,
} from "@/domain/versions/enterprise/entities/release-version.entity";

export class PrismaReleaseVersionMapper {
    static toDomain(raw: PrismaReleaseVersion): ReleaseVersionEntity {
        const version = ReleaseVersionEntity.create(
            {
                spaceId: raw.spaceId,
                key: raw.key,
                label: raw.label,
                status: this.fromPrismaStatus(raw.status),
                isDefault: raw.isDefault,
                publishedAt: raw.publishedAt,
            },
            raw.id,
        );

        version.createdAt = raw.createdAt;
        version.updatedAt = raw.updatedAt;

        return version;
    }

    static toPrismaStatus(status: ReleaseVersionStatus): PrismaReleaseVersionStatus {
        const statusMap: Record<ReleaseVersionStatus, PrismaReleaseVersionStatus> = {
            [RELEASE_VERSION_STATUS.DRAFT]: "DRAFT",
            [RELEASE_VERSION_STATUS.PUBLISHED]: "PUBLISHED",
            [RELEASE_VERSION_STATUS.ARCHIVED]: "ARCHIVED",
        };

        return statusMap[status];
    }

    static fromPrismaStatus(status: PrismaReleaseVersionStatus): ReleaseVersionStatus {
        const statusMap: Record<PrismaReleaseVersionStatus, ReleaseVersionStatus> = {
            DRAFT: RELEASE_VERSION_STATUS.DRAFT,
            PUBLISHED: RELEASE_VERSION_STATUS.PUBLISHED,
            ARCHIVED: RELEASE_VERSION_STATUS.ARCHIVED,
        };

        return statusMap[status];
    }
}
