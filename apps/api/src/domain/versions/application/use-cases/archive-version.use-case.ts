import { ReleaseVersionsRepository } from "../repositories/release-versions.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import {
    RELEASE_VERSION_STATUS,
    ReleaseVersionEntity,
} from "@/domain/versions/enterprise/entities/release-version.entity";
import { ReleaseVersionNotFoundError } from "@/domain/versions/errors/release-version-not-found.error";

interface ArchiveVersionRequest {
    versionId: string;
}

type ArchiveVersionError = ReleaseVersionNotFoundError;

type ArchiveVersionResponse = Either<ArchiveVersionError, { version: ReleaseVersionEntity }>;

export class ArchiveVersionUseCase {
    constructor(private releaseVersionsRepository: ReleaseVersionsRepository) {}

    async execute(request: ArchiveVersionRequest): Promise<ArchiveVersionResponse> {
        const existingVersion = await this.releaseVersionsRepository.findById(request.versionId);

        if (!existingVersion) {
            return Left.call(new ReleaseVersionNotFoundError());
        }

        if (existingVersion.status === RELEASE_VERSION_STATUS.ARCHIVED) {
            return Right.call({ version: existingVersion });
        }

        const version = await this.releaseVersionsRepository.archive(request.versionId);

        if (!version) {
            return Left.call(new ReleaseVersionNotFoundError());
        }

        return Right.call({ version });
    }
}
