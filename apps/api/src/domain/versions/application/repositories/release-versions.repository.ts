import { ReleaseVersionEntity } from "../../enterprise/entities/release-version.entity";

export interface CreateReleaseVersionParams {
    spaceId: string;
    key: string;
    label: string;
}

export interface UpdateReleaseVersionParams {
    label?: string;
    key?: string;
}

export interface ReleaseVersionsRepository {
    findById(id: string): Promise<ReleaseVersionEntity | null>;
    findByKeyInSpace(spaceId: string, key: string): Promise<ReleaseVersionEntity | null>;
    listBySpaceId(spaceId: string): Promise<ReleaseVersionEntity[]>;
    create(params: CreateReleaseVersionParams): Promise<ReleaseVersionEntity>;
    update(versionId: string, params: UpdateReleaseVersionParams): Promise<ReleaseVersionEntity | null>;
    delete(versionId: string): Promise<ReleaseVersionEntity | null>;
    publish(versionId: string): Promise<ReleaseVersionEntity | null>;
    unpublish(versionId: string): Promise<ReleaseVersionEntity | null>;
    setDefault(versionId: string): Promise<ReleaseVersionEntity | null>;
    archive(versionId: string): Promise<ReleaseVersionEntity | null>;
}
