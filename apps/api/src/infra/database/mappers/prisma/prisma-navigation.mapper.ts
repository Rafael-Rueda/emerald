import type {
    NavigationNode as PrismaNavigationNode,
    NavigationNodeType as PrismaNavigationNodeType,
} from "@prisma/client";

import {
    NAVIGATION_NODE_TYPE,
    NavigationNodeEntity,
    type NavigationNodeType,
} from "@/domain/navigation/enterprise/entities/navigation-node.entity";

export class PrismaNavigationMapper {
    static toDomain(raw: PrismaNavigationNode): NavigationNodeEntity {
        const node = NavigationNodeEntity.create(
            {
                spaceId: raw.spaceId,
                releaseVersionId: raw.releaseVersionId,
                parentId: raw.parentId,
                documentId: raw.documentId,
                label: raw.label,
                slug: raw.slug,
                order: raw.order,
                nodeType: this.fromPrismaNodeType(raw.nodeType),
                externalUrl: raw.externalUrl,
            },
            raw.id,
        );

        node.createdAt = raw.createdAt;
        node.updatedAt = raw.updatedAt;

        return node;
    }

    static toPrismaNodeType(nodeType: NavigationNodeType): PrismaNavigationNodeType {
        const nodeTypeMap: Record<NavigationNodeType, PrismaNavigationNodeType> = {
            [NAVIGATION_NODE_TYPE.DOCUMENT]: "DOCUMENT",
            [NAVIGATION_NODE_TYPE.GROUP]: "GROUP",
            [NAVIGATION_NODE_TYPE.EXTERNAL_LINK]: "EXTERNAL_LINK",
        };

        return nodeTypeMap[nodeType];
    }

    static fromPrismaNodeType(nodeType: PrismaNavigationNodeType): NavigationNodeType {
        const nodeTypeMap: Record<PrismaNavigationNodeType, NavigationNodeType> = {
            DOCUMENT: NAVIGATION_NODE_TYPE.DOCUMENT,
            GROUP: NAVIGATION_NODE_TYPE.GROUP,
            EXTERNAL_LINK: NAVIGATION_NODE_TYPE.EXTERNAL_LINK,
        };

        return nodeTypeMap[nodeType];
    }
}
