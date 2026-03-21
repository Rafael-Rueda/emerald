import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { CreateNavigationNodeUseCase } from "@/domain/navigation/application/use-cases/create-navigation-node.use-case";
import { DeleteNavigationNodeUseCase } from "@/domain/navigation/application/use-cases/delete-navigation-node.use-case";
import { GetNavigationTreeUseCase } from "@/domain/navigation/application/use-cases/get-navigation-tree.use-case";
import { MoveNavigationNodeUseCase } from "@/domain/navigation/application/use-cases/move-navigation-node.use-case";
import { UpdateNavigationNodeUseCase } from "@/domain/navigation/application/use-cases/update-navigation-node.use-case";
import { NavigationPresenter } from "@/http/workspace/presenters/navigation.presenter";
import {
    CreateNavigationNodeBodyDTO,
    GetNavigationTreeQueryDTO,
    MoveNavigationNodeBodyDTO,
    UpdateNavigationNodeBodyDTO,
} from "@/http/workspace/schemas/navigation.schema";

@Injectable()
export class NavigationService {
    constructor(
        @Inject("CreateNavigationNodeUseCase")
        private createNavigationNodeUseCase: CreateNavigationNodeUseCase,
        @Inject("GetNavigationTreeUseCase")
        private getNavigationTreeUseCase: GetNavigationTreeUseCase,
        @Inject("MoveNavigationNodeUseCase")
        private moveNavigationNodeUseCase: MoveNavigationNodeUseCase,
        @Inject("UpdateNavigationNodeUseCase")
        private updateNavigationNodeUseCase: UpdateNavigationNodeUseCase,
        @Inject("DeleteNavigationNodeUseCase")
        private deleteNavigationNodeUseCase: DeleteNavigationNodeUseCase,
    ) {}

    async create(body: CreateNavigationNodeBodyDTO) {
        const result = await this.createNavigationNodeUseCase.execute({
            spaceId: body.spaceId,
            releaseVersionId: body.releaseVersionId,
            parentId: body.parentId,
            documentId: body.documentId,
            label: body.label,
            slug: body.slug,
            order: body.order,
            nodeType: body.nodeType,
            externalUrl: body.externalUrl,
        });

        if (result.isLeft()) {
            throw new NotFoundException(result.value.message);
        }

        return NavigationPresenter.toHTTP(result.value.node);
    }

    async getTree(query: GetNavigationTreeQueryDTO) {
        const result = await this.getNavigationTreeUseCase.execute({
            spaceId: query.spaceId,
        });

        return {
            items: NavigationPresenter.toTreeHTTP(result.value.items),
        };
    }

    async move(nodeId: string, body: MoveNavigationNodeBodyDTO) {
        const result = await this.moveNavigationNodeUseCase.execute({
            nodeId,
            parentId: body.parentId,
            order: body.order,
        });

        if (result.isLeft()) {
            const error = result.value;

            if (error.name === "NavigationNodeNotFoundError") {
                throw new NotFoundException(error.message);
            }

            if (error.name === "NavigationCircularReferenceError") {
                throw new BadRequestException(error.message);
            }

            throw new BadRequestException(error.message);
        }

        return NavigationPresenter.toHTTP(result.value.node);
    }

    async update(nodeId: string, body: UpdateNavigationNodeBodyDTO) {
        const result = await this.updateNavigationNodeUseCase.execute({
            nodeId,
            documentId: body.documentId,
            label: body.label,
            slug: body.slug,
            order: body.order,
            nodeType: body.nodeType,
            externalUrl: body.externalUrl,
        });

        if (result.isLeft()) {
            throw new NotFoundException(result.value.message);
        }

        return NavigationPresenter.toHTTP(result.value.node);
    }

    async remove(nodeId: string) {
        const result = await this.deleteNavigationNodeUseCase.execute({
            nodeId,
        });

        if (result.isLeft()) {
            throw new NotFoundException(result.value.message);
        }

        return NavigationPresenter.toHTTP(result.value.node);
    }
}
