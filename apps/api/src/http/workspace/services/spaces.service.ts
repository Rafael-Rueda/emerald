import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { CreateSpaceUseCase } from "@/domain/spaces/application/use-cases/create-space.use-case";
import { DeleteSpaceUseCase } from "@/domain/spaces/application/use-cases/delete-space.use-case";
import { GetSpaceByIdUseCase } from "@/domain/spaces/application/use-cases/get-space-by-id.use-case";
import { ListSpacesUseCase } from "@/domain/spaces/application/use-cases/list-spaces.use-case";
import { UpdateSpaceUseCase } from "@/domain/spaces/application/use-cases/update-space.use-case";
import { SpacePresenter } from "@/http/workspace/presenters/space.presenter";
import { CreateSpaceBodyDTO, UpdateSpaceBodyDTO } from "@/http/workspace/schemas/spaces.schema";

@Injectable()
export class SpacesService {
    constructor(
        @Inject("CreateSpaceUseCase")
        private createSpaceUseCase: CreateSpaceUseCase,
        @Inject("GetSpaceByIdUseCase")
        private getSpaceByIdUseCase: GetSpaceByIdUseCase,
        @Inject("ListSpacesUseCase")
        private listSpacesUseCase: ListSpacesUseCase,
        @Inject("UpdateSpaceUseCase")
        private updateSpaceUseCase: UpdateSpaceUseCase,
        @Inject("DeleteSpaceUseCase")
        private deleteSpaceUseCase: DeleteSpaceUseCase,
    ) {}

    async create(body: CreateSpaceBodyDTO) {
        const result = await this.createSpaceUseCase.execute({
            key: body.key,
            name: body.name,
            description: body.description,
        });

        if (result.isLeft()) {
            const error = result.value;

            if (error.name === "SpaceAlreadyExistsError") {
                throw new ConflictException(error.message);
            }

            throw new BadRequestException(error.message);
        }

        return SpacePresenter.toHTTP(result.value.space);
    }

    async findAll() {
        const result = await this.listSpacesUseCase.execute();

        const spaces = result.value.spaces.map((space) => SpacePresenter.toHTTP(space));

        return {
            spaces,
            total: spaces.length,
        };
    }

    async findOne(spaceId: string) {
        const result = await this.getSpaceByIdUseCase.execute({ spaceId });

        if (result.isLeft()) {
            const error = result.value;

            if (error.name === "SpaceNotFoundError") {
                throw new NotFoundException(error.message);
            }

            throw new BadRequestException(error.message);
        }

        return SpacePresenter.toHTTP(result.value.space);
    }

    async update(spaceId: string, body: UpdateSpaceBodyDTO) {
        const result = await this.updateSpaceUseCase.execute({
            spaceId,
            key: body.key,
            name: body.name,
            description: body.description,
        });

        if (result.isLeft()) {
            const error = result.value;

            if (error.name === "SpaceNotFoundError") {
                throw new NotFoundException(error.message);
            }

            if (error.name === "SpaceAlreadyExistsError") {
                throw new ConflictException(error.message);
            }

            throw new BadRequestException(error.message);
        }

        return SpacePresenter.toHTTP(result.value.space);
    }

    async remove(spaceId: string) {
        const result = await this.deleteSpaceUseCase.execute({ spaceId });

        if (result.isLeft()) {
            const error = result.value;

            if (error.name === "SpaceNotFoundError") {
                throw new NotFoundException(error.message);
            }

            throw new BadRequestException(error.message);
        }

        return SpacePresenter.toHTTP(result.value.space);
    }
}
