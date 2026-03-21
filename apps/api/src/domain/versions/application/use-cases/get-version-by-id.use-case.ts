import { ReleaseVersionsRepository } from "../repositories/release-versions.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { ReleaseVersionEntity } from "@/domain/versions/enterprise/entities/release-version.entity";
import { ReleaseVersionNotFoundError } from "@/domain/versions/errors/release-version-not-found.error";

interface GetVersionByIdRequest {
    versionId: string;
}

type GetVersionByIdError = ReleaseVersionNotFoundError;

type GetVersionByIdResponse = Either<GetVersionByIdError, { version: ReleaseVersionEntity }>;

export class GetVersionByIdUseCase {
    constructor(private releaseVersionsRepository: ReleaseVersionsRepository) {}

    async execute(request: GetVersionByIdRequest): Promise<GetVersionByIdResponse> {
        const version = await this.releaseVersionsRepository.findById(request.versionId);

        if (!version) {
            return Left.call(new ReleaseVersionNotFoundError());
        }

        return Right.call({ version });
    }
}
