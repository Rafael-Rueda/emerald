import { ReleaseVersionsRepository } from "../repositories/release-versions.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import {
    RELEASE_VERSION_STATUS,
    ReleaseVersionEntity,
} from "@/domain/versions/enterprise/entities/release-version.entity";
import { ReleaseVersionNotFoundError } from "@/domain/versions/errors/release-version-not-found.error";

interface UnpublishVersionRequest {
    versionId: string;
}

type UnpublishVersionError = ReleaseVersionNotFoundError;

type UnpublishVersionResponse = Either<UnpublishVersionError, { version: ReleaseVersionEntity }>;

export class UnpublishVersionUseCase {
    constructor(private releaseVersionsRepository: ReleaseVersionsRepository) {}

    async execute(request: UnpublishVersionRequest): Promise<UnpublishVersionResponse> {
        const existingVersion = await this.releaseVersionsRepository.findById(request.versionId);

        if (!existingVersion) {
            return Left.call(new ReleaseVersionNotFoundError());
        }

        if (existingVersion.status === RELEASE_VERSION_STATUS.DRAFT) {
            return Right.call({ version: existingVersion });
        }

        const version = await this.releaseVersionsRepository.unpublish(request.versionId);

        if (!version) {
            return Left.call(new ReleaseVersionNotFoundError());
        }

        return Right.call({ version });
    }
}
