import { Module } from "@nestjs/common";

import { PrismaModule } from "./prisma.module";

import { SpacesRepository } from "@/domain/spaces/application/repositories/spaces.repository";
import { CreateSpaceUseCase } from "@/domain/spaces/application/use-cases/create-space.use-case";
import { DeleteSpaceUseCase } from "@/domain/spaces/application/use-cases/delete-space.use-case";
import { GetSpaceByIdUseCase } from "@/domain/spaces/application/use-cases/get-space-by-id.use-case";
import { ListSpacesUseCase } from "@/domain/spaces/application/use-cases/list-spaces.use-case";
import { UpdateSpaceUseCase } from "@/domain/spaces/application/use-cases/update-space.use-case";
import { PrismaSpacesRepository } from "@/infra/database/repositories/prisma/prisma-spaces.repository";

@Module({
    imports: [PrismaModule],
    providers: [
        {
            provide: "SpacesRepository",
            useClass: PrismaSpacesRepository,
        },
        {
            provide: "CreateSpaceUseCase",
            inject: ["SpacesRepository"],
            useFactory: (spacesRepository: SpacesRepository) => new CreateSpaceUseCase(spacesRepository),
        },
        {
            provide: "GetSpaceByIdUseCase",
            inject: ["SpacesRepository"],
            useFactory: (spacesRepository: SpacesRepository) => new GetSpaceByIdUseCase(spacesRepository),
        },
        {
            provide: "ListSpacesUseCase",
            inject: ["SpacesRepository"],
            useFactory: (spacesRepository: SpacesRepository) => new ListSpacesUseCase(spacesRepository),
        },
        {
            provide: "UpdateSpaceUseCase",
            inject: ["SpacesRepository"],
            useFactory: (spacesRepository: SpacesRepository) => new UpdateSpaceUseCase(spacesRepository),
        },
        {
            provide: "DeleteSpaceUseCase",
            inject: ["SpacesRepository"],
            useFactory: (spacesRepository: SpacesRepository) => new DeleteSpaceUseCase(spacesRepository),
        },
    ],
    exports: [
        "SpacesRepository",
        "CreateSpaceUseCase",
        "GetSpaceByIdUseCase",
        "ListSpacesUseCase",
        "UpdateSpaceUseCase",
        "DeleteSpaceUseCase",
    ],
})
export class SpacesSharedModule {}
