import { ReleaseVersionsRepository } from "../repositories/release-versions.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { ReleaseVersionEntity } from "@/domain/versions/enterprise/entities/release-version.entity";
import { ReleaseVersionNotFoundError } from "@/domain/versions/errors/release-version-not-found.error";

interface DeleteVersionRequest {
    versionId: string;
}

type DeleteVersionError = ReleaseVersionNotFoundError;

type DeleteVersionResponse = Either<DeleteVersionError, { version: ReleaseVersionEntity }>;

export class DeleteVersionUseCase {
    constructor(private releaseVersionsRepository: ReleaseVersionsRepository) {}

    async execute(request: DeleteVersionRequest): Promise<DeleteVersionResponse> {
        const deletedVersion = await this.releaseVersionsRepository.delete(request.versionId);

        if (!deletedVersion) {
            return Left.call(new ReleaseVersionNotFoundError());
        }

        return Right.call({ version: deletedVersion });
    }
}
