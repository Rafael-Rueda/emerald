import { Either, Left, Right } from "@/domain/@shared/either";
import { SpaceEntity } from "@/domain/spaces/enterprise/entities/space.entity";
import { SpaceAlreadyExistsError } from "@/domain/spaces/errors/space-already-exists.error";

import { SpacesRepository } from "../repositories/spaces.repository";

interface CreateSpaceRequest {
    key: string;
    name: string;
    description?: string;
}

type CreateSpaceError = SpaceAlreadyExistsError;

type CreateSpaceResponse = Either<CreateSpaceError, { space: SpaceEntity }>;

export class CreateSpaceUseCase {
    constructor(private spacesRepository: SpacesRepository) {}

    async execute(request: CreateSpaceRequest): Promise<CreateSpaceResponse> {
        const existingSpace = await this.spacesRepository.findByKey(request.key);

        if (existingSpace) {
            return Left.call(new SpaceAlreadyExistsError());
        }

        const spaceToCreate = SpaceEntity.create({
            key: request.key,
            name: request.name,
            description: request.description ?? "",
        });

        const space = await this.spacesRepository.create(spaceToCreate);

        return Right.call({ space });
    }
}
