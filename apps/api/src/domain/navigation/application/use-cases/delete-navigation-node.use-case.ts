import { NavigationRepository } from "../repositories/navigation.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { NavigationNodeEntity } from "@/domain/navigation/enterprise/entities/navigation-node.entity";
import { NavigationNodeNotFoundError } from "@/domain/navigation/errors/navigation-node-not-found.error";

interface DeleteNavigationNodeRequest {
    nodeId: string;
}

type DeleteNavigationNodeError = NavigationNodeNotFoundError;

type DeleteNavigationNodeResponse = Either<DeleteNavigationNodeError, { node: NavigationNodeEntity }>;

export class DeleteNavigationNodeUseCase {
    constructor(private navigationRepository: NavigationRepository) {}

    async execute(request: DeleteNavigationNodeRequest): Promise<DeleteNavigationNodeResponse> {
        const deletedNode = await this.navigationRepository.delete(request.nodeId);

        if (!deletedNode) {
            return Left.call(new NavigationNodeNotFoundError());
        }

        return Right.call({ node: deletedNode });
    }
}
