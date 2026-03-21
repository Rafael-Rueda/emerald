import { NavigationRepository } from "../repositories/navigation.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { NavigationNodeEntity, type NavigationNodeType } from "@/domain/navigation/enterprise/entities/navigation-node.entity";
import { NavigationNodeNotFoundError } from "@/domain/navigation/errors/navigation-node-not-found.error";

interface UpdateNavigationNodeRequest {
    nodeId: string;
    documentId?: string | null;
    label?: string;
    slug?: string;
    order?: number;
    nodeType?: NavigationNodeType;
    externalUrl?: string | null;
}

type UpdateNavigationNodeError = NavigationNodeNotFoundError;

type UpdateNavigationNodeResponse = Either<UpdateNavigationNodeError, { node: NavigationNodeEntity }>;

export class UpdateNavigationNodeUseCase {
    constructor(private navigationRepository: NavigationRepository) {}

    async execute(request: UpdateNavigationNodeRequest): Promise<UpdateNavigationNodeResponse> {
        const node = await this.navigationRepository.update({
            nodeId: request.nodeId,
            documentId: request.documentId,
            label: request.label,
            slug: request.slug,
            order: request.order,
            nodeType: request.nodeType,
            externalUrl: request.externalUrl,
        });

        if (!node) {
            return Left.call(new NavigationNodeNotFoundError());
        }

        return Right.call({ node });
    }
}
