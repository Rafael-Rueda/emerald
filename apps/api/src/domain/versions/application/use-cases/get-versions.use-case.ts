import { ReleaseVersionsRepository } from "../repositories/release-versions.repository";

import { Either, Right } from "@/domain/@shared/either";
import { ReleaseVersionEntity } from "@/domain/versions/enterprise/entities/release-version.entity";

interface GetVersionsRequest {
    spaceId: string;
}

type GetVersionsResponse = Either<never, { versions: ReleaseVersionEntity[] }>;

export class GetVersionsUseCase {
    constructor(private releaseVersionsRepository: ReleaseVersionsRepository) {}

    async execute(request: GetVersionsRequest): Promise<GetVersionsResponse> {
        const versions = await this.releaseVersionsRepository.listBySpaceId(request.spaceId);

        return Right.call({ versions });
    }
}
