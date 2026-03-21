import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { ArchiveVersionUseCase } from "@/domain/versions/application/use-cases/archive-version.use-case";
import { CreateReleaseVersionUseCase } from "@/domain/versions/application/use-cases/create-release-version.use-case";
import { GetVersionByIdUseCase } from "@/domain/versions/application/use-cases/get-version-by-id.use-case";
import { GetVersionsUseCase } from "@/domain/versions/application/use-cases/get-versions.use-case";
import { PublishVersionUseCase } from "@/domain/versions/application/use-cases/publish-version.use-case";
import { SetDefaultVersionUseCase } from "@/domain/versions/application/use-cases/set-default-version.use-case";
import { VersionPresenter } from "@/http/workspace/presenters/version.presenter";
import { CreateVersionBodyDTO, ListVersionsQueryDTO } from "@/http/workspace/schemas/versions.schema";

@Injectable()
export class VersionsService {
    constructor(
        @Inject("CreateReleaseVersionUseCase")
        private createReleaseVersionUseCase: CreateReleaseVersionUseCase,
        @Inject("GetVersionsUseCase")
        private getVersionsUseCase: GetVersionsUseCase,
        @Inject("GetVersionByIdUseCase")
        private getVersionByIdUseCase: GetVersionByIdUseCase,
        @Inject("PublishVersionUseCase")
        private publishVersionUseCase: PublishVersionUseCase,
        @Inject("SetDefaultVersionUseCase")
        private setDefaultVersionUseCase: SetDefaultVersionUseCase,
        @Inject("ArchiveVersionUseCase")
        private archiveVersionUseCase: ArchiveVersionUseCase,
    ) {}

    async create(body: CreateVersionBodyDTO) {
        const result = await this.createReleaseVersionUseCase.execute({
            spaceId: body.spaceId,
            key: body.key,
            label: body.label,
        });

        if (result.isLeft()) {
            const error = result.value;

            if (error.name === "ReleaseVersionKeyAlreadyExistsError") {
                throw new ConflictException(error.message);
            }

            throw new BadRequestException(error.message);
        }

        return VersionPresenter.toHTTP(result.value.version);
    }

    async findAll(query: ListVersionsQueryDTO) {
        const result = await this.getVersionsUseCase.execute({
            spaceId: query.spaceId,
        });

        const versions = result.value.versions.map((version) => VersionPresenter.toHTTP(version));

        return {
            versions,
            total: versions.length,
        };
    }

    async findOne(versionId: string) {
        const result = await this.getVersionByIdUseCase.execute({
            versionId,
        });

        if (result.isLeft()) {
            throw new NotFoundException(result.value.message);
        }

        return VersionPresenter.toHTTP(result.value.version);
    }

    async publish(versionId: string) {
        const result = await this.publishVersionUseCase.execute({
            versionId,
        });

        if (result.isLeft()) {
            throw new NotFoundException(result.value.message);
        }

        return VersionPresenter.toHTTP(result.value.version);
    }

    async setDefault(versionId: string) {
        const result = await this.setDefaultVersionUseCase.execute({
            versionId,
        });

        if (result.isLeft()) {
            throw new NotFoundException(result.value.message);
        }

        return VersionPresenter.toHTTP(result.value.version);
    }

    async archive(versionId: string) {
        const result = await this.archiveVersionUseCase.execute({
            versionId,
        });

        if (result.isLeft()) {
            throw new NotFoundException(result.value.message);
        }

        return VersionPresenter.toHTTP(result.value.version);
    }
}
