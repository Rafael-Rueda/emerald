import { NavigationRepository } from "../repositories/navigation.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { NavigationNodeEntity, type NavigationNodeType } from "@/domain/navigation/enterprise/entities/navigation-node.entity";
import { NavigationNodeNotFoundError } from "@/domain/navigation/errors/navigation-node-not-found.error";

interface CreateNavigationNodeRequest {
    spaceId: string;
    releaseVersionId?: string | null;
    parentId?: string | null;
    documentId?: string | null;
    label: string;
    slug: string;
    order: number;
    nodeType: NavigationNodeType;
    externalUrl?: string | null;
}

type CreateNavigationNodeError = NavigationNodeNotFoundError;

type CreateNavigationNodeResponse = Either<CreateNavigationNodeError, { node: NavigationNodeEntity }>;

export class CreateNavigationNodeUseCase {
    constructor(private navigationRepository: NavigationRepository) {}

    async execute(request: CreateNavigationNodeRequest): Promise<CreateNavigationNodeResponse> {
        if (request.parentId) {
            const parent = await this.navigationRepository.findById(request.parentId);

            if (!parent || parent.spaceId !== request.spaceId) {
                return Left.call(new NavigationNodeNotFoundError());
            }
        }

        const node = await this.navigationRepository.create({
            spaceId: request.spaceId,
            releaseVersionId: request.releaseVersionId ?? null,
            parentId: request.parentId ?? null,
            documentId: request.documentId ?? null,
            label: request.label,
            slug: request.slug,
            order: request.order,
            nodeType: request.nodeType,
            externalUrl: request.externalUrl ?? null,
        });

        return Right.call({ node });
    }
}
