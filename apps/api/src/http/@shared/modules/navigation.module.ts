import { Module } from "@nestjs/common";

import { PrismaModule } from "./prisma.module";

import { NavigationRepository } from "@/domain/navigation/application/repositories/navigation.repository";
import { CreateNavigationNodeUseCase } from "@/domain/navigation/application/use-cases/create-navigation-node.use-case";
import { DeleteNavigationNodeUseCase } from "@/domain/navigation/application/use-cases/delete-navigation-node.use-case";
import { GetNavigationTreeUseCase } from "@/domain/navigation/application/use-cases/get-navigation-tree.use-case";
import { MoveNavigationNodeUseCase } from "@/domain/navigation/application/use-cases/move-navigation-node.use-case";
import { UpdateNavigationNodeUseCase } from "@/domain/navigation/application/use-cases/update-navigation-node.use-case";
import { PrismaNavigationRepository } from "@/infra/database/repositories/prisma/prisma-navigation.repository";

@Module({
    imports: [PrismaModule],
    providers: [
        {
            provide: "NavigationRepository",
            useClass: PrismaNavigationRepository,
        },
        {
            provide: "CreateNavigationNodeUseCase",
            inject: ["NavigationRepository"],
            useFactory: (navigationRepository: NavigationRepository) =>
                new CreateNavigationNodeUseCase(navigationRepository),
        },
        {
            provide: "GetNavigationTreeUseCase",
            inject: ["NavigationRepository"],
            useFactory: (navigationRepository: NavigationRepository) =>
                new GetNavigationTreeUseCase(navigationRepository),
        },
        {
            provide: "MoveNavigationNodeUseCase",
            inject: ["NavigationRepository"],
            useFactory: (navigationRepository: NavigationRepository) =>
                new MoveNavigationNodeUseCase(navigationRepository),
        },
        {
            provide: "UpdateNavigationNodeUseCase",
            inject: ["NavigationRepository"],
            useFactory: (navigationRepository: NavigationRepository) =>
                new UpdateNavigationNodeUseCase(navigationRepository),
        },
        {
            provide: "DeleteNavigationNodeUseCase",
            inject: ["NavigationRepository"],
            useFactory: (navigationRepository: NavigationRepository) =>
                new DeleteNavigationNodeUseCase(navigationRepository),
        },
    ],
    exports: [
        "NavigationRepository",
        "CreateNavigationNodeUseCase",
        "GetNavigationTreeUseCase",
        "MoveNavigationNodeUseCase",
        "UpdateNavigationNodeUseCase",
        "DeleteNavigationNodeUseCase",
    ],
})
export class NavigationSharedModule {}
