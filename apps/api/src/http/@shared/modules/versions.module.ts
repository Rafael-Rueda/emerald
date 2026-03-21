import { Module } from "@nestjs/common";

import { PrismaModule } from "./prisma.module";

import { ReleaseVersionsRepository } from "@/domain/versions/application/repositories/release-versions.repository";
import { ArchiveVersionUseCase } from "@/domain/versions/application/use-cases/archive-version.use-case";
import { CreateReleaseVersionUseCase } from "@/domain/versions/application/use-cases/create-release-version.use-case";
import { GetVersionByIdUseCase } from "@/domain/versions/application/use-cases/get-version-by-id.use-case";
import { GetVersionsUseCase } from "@/domain/versions/application/use-cases/get-versions.use-case";
import { PublishVersionUseCase } from "@/domain/versions/application/use-cases/publish-version.use-case";
import { SetDefaultVersionUseCase } from "@/domain/versions/application/use-cases/set-default-version.use-case";
import { PrismaReleaseVersionsRepository } from "@/infra/database/repositories/prisma/prisma-release-versions.repository";

@Module({
    imports: [PrismaModule],
    providers: [
        {
            provide: "ReleaseVersionsRepository",
            useClass: PrismaReleaseVersionsRepository,
        },
        {
            provide: "CreateReleaseVersionUseCase",
            inject: ["ReleaseVersionsRepository"],
            useFactory: (releaseVersionsRepository: ReleaseVersionsRepository) =>
                new CreateReleaseVersionUseCase(releaseVersionsRepository),
        },
        {
            provide: "GetVersionsUseCase",
            inject: ["ReleaseVersionsRepository"],
            useFactory: (releaseVersionsRepository: ReleaseVersionsRepository) =>
                new GetVersionsUseCase(releaseVersionsRepository),
        },
        {
            provide: "GetVersionByIdUseCase",
            inject: ["ReleaseVersionsRepository"],
            useFactory: (releaseVersionsRepository: ReleaseVersionsRepository) =>
                new GetVersionByIdUseCase(releaseVersionsRepository),
        },
        {
            provide: "PublishVersionUseCase",
            inject: ["ReleaseVersionsRepository"],
            useFactory: (releaseVersionsRepository: ReleaseVersionsRepository) =>
                new PublishVersionUseCase(releaseVersionsRepository),
        },
        {
            provide: "SetDefaultVersionUseCase",
            inject: ["ReleaseVersionsRepository"],
            useFactory: (releaseVersionsRepository: ReleaseVersionsRepository) =>
                new SetDefaultVersionUseCase(releaseVersionsRepository),
        },
        {
            provide: "ArchiveVersionUseCase",
            inject: ["ReleaseVersionsRepository"],
            useFactory: (releaseVersionsRepository: ReleaseVersionsRepository) =>
                new ArchiveVersionUseCase(releaseVersionsRepository),
        },
    ],
    exports: [
        "ReleaseVersionsRepository",
        "CreateReleaseVersionUseCase",
        "GetVersionsUseCase",
        "GetVersionByIdUseCase",
        "PublishVersionUseCase",
        "SetDefaultVersionUseCase",
        "ArchiveVersionUseCase",
    ],
})
export class VersionsSharedModule {}
