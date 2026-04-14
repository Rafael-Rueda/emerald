import { ReleaseVersionsRepository } from "../repositories/release-versions.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { ReleaseVersionEntity } from "@/domain/versions/enterprise/entities/release-version.entity";
import { ReleaseVersionKeyAlreadyExistsError } from "@/domain/versions/errors/release-version-key-already-exists.error";
import { ReleaseVersionNotFoundError } from "@/domain/versions/errors/release-version-not-found.error";

interface UpdateVersionRequest {
    versionId: string;
    label?: string;
    key?: string;
}

type UpdateVersionError = ReleaseVersionNotFoundError | ReleaseVersionKeyAlreadyExistsError;

type UpdateVersionResponse = Either<UpdateVersionError, { version: ReleaseVersionEntity }>;

export class UpdateVersionUseCase {
    constructor(private releaseVersionsRepository: ReleaseVersionsRepository) {}

    async execute(request: UpdateVersionRequest): Promise<UpdateVersionResponse> {
        const existingVersion = await this.releaseVersionsRepository.findById(request.versionId);

        if (!existingVersion) {
            return Left.call(new ReleaseVersionNotFoundError());
        }

        if (request.key && request.key !== existingVersion.key) {
            const duplicate = await this.releaseVersionsRepository.findByKeyInSpace(
                existingVersion.spaceId,
                request.key,
            );

            if (duplicate) {
                return Left.call(new ReleaseVersionKeyAlreadyExistsError());
            }
        }

        const version = await this.releaseVersionsRepository.update(request.versionId, {
            label: request.label,
            key: request.key,
        });

        if (!version) {
            return Left.call(new ReleaseVersionNotFoundError());
        }

        return Right.call({ version });
    }
}
