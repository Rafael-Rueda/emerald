import { ReleaseVersionEntity } from "@/domain/versions/enterprise/entities/release-version.entity";

export class VersionPresenter {
    static toHTTP(version: ReleaseVersionEntity) {
        return {
            id: version.id.toString(),
            spaceId: version.spaceId,
            key: version.key,
            label: version.label,
            status: version.status,
            isDefault: version.isDefault,
            publishedAt: version.publishedAt?.toISOString() ?? null,
            createdAt: version.createdAt.toISOString(),
            updatedAt: version.updatedAt.toISOString(),
        };
    }
}
