import { ReleaseVersionEntity } from "../../enterprise/entities/release-version.entity";

export interface CreateReleaseVersionParams {
    spaceId: string;
    key: string;
    label: string;
}

export interface ReleaseVersionsRepository {
    findById(id: string): Promise<ReleaseVersionEntity | null>;
    findByKeyInSpace(spaceId: string, key: string): Promise<ReleaseVersionEntity | null>;
    listBySpaceId(spaceId: string): Promise<ReleaseVersionEntity[]>;
    create(params: CreateReleaseVersionParams): Promise<ReleaseVersionEntity>;
    publish(versionId: string): Promise<ReleaseVersionEntity | null>;
    setDefault(versionId: string): Promise<ReleaseVersionEntity | null>;
    archive(versionId: string): Promise<ReleaseVersionEntity | null>;
}
