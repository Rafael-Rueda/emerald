import { Either, Right } from "@/domain/@shared/either";
import { SpaceEntity } from "@/domain/spaces/enterprise/entities/space.entity";

import { SpacesRepository } from "../repositories/spaces.repository";

type ListSpacesResponse = Either<never, { spaces: SpaceEntity[] }>;

export class ListSpacesUseCase {
    constructor(private spacesRepository: SpacesRepository) {}

    async execute(): Promise<ListSpacesResponse> {
        const spaces = await this.spacesRepository.list();

        return Right.call({ spaces });
    }
}
