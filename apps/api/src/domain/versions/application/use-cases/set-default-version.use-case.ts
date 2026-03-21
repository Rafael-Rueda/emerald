import { ReleaseVersionsRepository } from "../repositories/release-versions.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { ReleaseVersionEntity } from "@/domain/versions/enterprise/entities/release-version.entity";
import { ReleaseVersionNotFoundError } from "@/domain/versions/errors/release-version-not-found.error";

interface SetDefaultVersionRequest {
    versionId: string;
}

type SetDefaultVersionError = ReleaseVersionNotFoundError;

type SetDefaultVersionResponse = Either<SetDefaultVersionError, { version: ReleaseVersionEntity }>;

export class SetDefaultVersionUseCase {
    constructor(private releaseVersionsRepository: ReleaseVersionsRepository) {}

    async execute(request: SetDefaultVersionRequest): Promise<SetDefaultVersionResponse> {
        const existingVersion = await this.releaseVersionsRepository.findById(request.versionId);

        if (!existingVersion) {
            return Left.call(new ReleaseVersionNotFoundError());
        }

        const version = await this.releaseVersionsRepository.setDefault(request.versionId);

        if (!version) {
            return Left.call(new ReleaseVersionNotFoundError());
        }

        return Right.call({ version });
    }
}
