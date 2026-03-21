import { ReleaseVersionsRepository } from "../repositories/release-versions.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { ReleaseVersionEntity } from "@/domain/versions/enterprise/entities/release-version.entity";
import { ReleaseVersionKeyAlreadyExistsError } from "@/domain/versions/errors/release-version-key-already-exists.error";

interface CreateReleaseVersionRequest {
    spaceId: string;
    key: string;
    label: string;
}

type CreateReleaseVersionError = ReleaseVersionKeyAlreadyExistsError;

type CreateReleaseVersionResponse = Either<CreateReleaseVersionError, { version: ReleaseVersionEntity }>;

export class CreateReleaseVersionUseCase {
    constructor(private releaseVersionsRepository: ReleaseVersionsRepository) {}

    async execute(request: CreateReleaseVersionRequest): Promise<CreateReleaseVersionResponse> {
        const duplicate = await this.releaseVersionsRepository.findByKeyInSpace(request.spaceId, request.key);

        if (duplicate) {
            return Left.call(new ReleaseVersionKeyAlreadyExistsError());
        }

        const version = await this.releaseVersionsRepository.create({
            spaceId: request.spaceId,
            key: request.key,
            label: request.label,
        });

        return Right.call({ version });
    }
}
