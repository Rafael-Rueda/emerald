import { Either, Left, Right } from "@/domain/@shared/either";
import { SpaceEntity } from "@/domain/spaces/enterprise/entities/space.entity";
import { SpaceNotFoundError } from "@/domain/spaces/errors/space-not-found.error";

import { SpacesRepository } from "../repositories/spaces.repository";

interface GetSpaceByIdRequest {
    spaceId: string;
}

type GetSpaceByIdError = SpaceNotFoundError;

type GetSpaceByIdResponse = Either<GetSpaceByIdError, { space: SpaceEntity }>;

export class GetSpaceByIdUseCase {
    constructor(private spacesRepository: SpacesRepository) {}

    async execute(request: GetSpaceByIdRequest): Promise<GetSpaceByIdResponse> {
        const space = await this.spacesRepository.findById(request.spaceId);

        if (!space) {
            return Left.call(new SpaceNotFoundError());
        }

        return Right.call({ space });
    }
}
