import { NavigationNodeEntity, type NavigationNodeType } from "../../enterprise/entities/navigation-node.entity";

export interface CreateNavigationNodeParams {
    spaceId: string;
    releaseVersionId: string | null;
    parentId: string | null;
    documentId: string | null;
    label: string;
    slug: string;
    order: number;
    nodeType: NavigationNodeType;
    externalUrl: string | null;
}

export interface UpdateNavigationNodeParams {
    nodeId: string;
    parentId?: string | null;
    documentId?: string | null;
    label?: string;
    slug?: string;
    order?: number;
    nodeType?: NavigationNodeType;
    externalUrl?: string | null;
}

export interface MoveNavigationNodeParams {
    nodeId: string;
    parentId: string | null;
    order: number;
}

export interface NavigationRepository {
    findById(id: string): Promise<NavigationNodeEntity | null>;
    listBySpaceId(spaceId: string): Promise<NavigationNodeEntity[]>;
    create(params: CreateNavigationNodeParams): Promise<NavigationNodeEntity>;
    update(params: UpdateNavigationNodeParams): Promise<NavigationNodeEntity | null>;
    move(params: MoveNavigationNodeParams): Promise<NavigationNodeEntity | null>;
    delete(nodeId: string): Promise<NavigationNodeEntity | null>;
}
