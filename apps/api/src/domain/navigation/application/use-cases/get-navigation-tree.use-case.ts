import { NavigationRepository } from "../repositories/navigation.repository";

import { Either, Right } from "@/domain/@shared/either";
import {
    NavigationNodeEntity,
    type NavigationTreeNode,
} from "@/domain/navigation/enterprise/entities/navigation-node.entity";

interface GetNavigationTreeRequest {
    spaceId: string;
    releaseVersionId?: string | null;
}

type GetNavigationTreeResponse = Either<never, { items: NavigationTreeNode[] }>;

export class GetNavigationTreeUseCase {
    constructor(private navigationRepository: NavigationRepository) {}

    async execute(request: GetNavigationTreeRequest): Promise<GetNavigationTreeResponse> {
        const nodes = await this.navigationRepository.listBySpaceId(request.spaceId, request.releaseVersionId);

        return Right.call({
            items: NavigationNodeEntity.buildTree(nodes),
        });
    }
}
