import { NavigationRepository } from "../repositories/navigation.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { NavigationNodeEntity } from "@/domain/navigation/enterprise/entities/navigation-node.entity";
import { NavigationCircularReferenceError } from "@/domain/navigation/errors/navigation-circular-reference.error";
import { NavigationNodeNotFoundError } from "@/domain/navigation/errors/navigation-node-not-found.error";

interface MoveNavigationNodeRequest {
    nodeId: string;
    parentId?: string | null;
    order: number;
}

type MoveNavigationNodeError = NavigationNodeNotFoundError | NavigationCircularReferenceError;

type MoveNavigationNodeResponse = Either<MoveNavigationNodeError, { node: NavigationNodeEntity }>;

export class MoveNavigationNodeUseCase {
    constructor(private navigationRepository: NavigationRepository) {}

    async execute(request: MoveNavigationNodeRequest): Promise<MoveNavigationNodeResponse> {
        const node = await this.navigationRepository.findById(request.nodeId);

        if (!node) {
            return Left.call(new NavigationNodeNotFoundError());
        }

        const allNodes = await this.navigationRepository.listBySpaceId(node.spaceId);
        const targetParentId = request.parentId ?? null;

        if (targetParentId !== null) {
            if (targetParentId === node.id.toString()) {
                return Left.call(new NavigationCircularReferenceError());
            }

            const descendants = NavigationNodeEntity.collectDescendantIds(allNodes, node.id.toString());

            if (descendants.has(targetParentId)) {
                return Left.call(new NavigationCircularReferenceError());
            }

            const parentExists = allNodes.some((candidateNode) => candidateNode.id.toString() === targetParentId);

            if (!parentExists) {
                return Left.call(new NavigationNodeNotFoundError());
            }
        }

        const movedNode = await this.navigationRepository.move({
            nodeId: node.id.toString(),
            parentId: targetParentId,
            order: request.order,
        });

        if (!movedNode) {
            return Left.call(new NavigationNodeNotFoundError());
        }

        return Right.call({ node: movedNode });
    }
}
