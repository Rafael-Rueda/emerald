import { NavigationNodeEntity, type NavigationTreeNode } from "@/domain/navigation/enterprise/entities/navigation-node.entity";

export class NavigationPresenter {
    static toHTTP(node: NavigationNodeEntity) {
        return {
            id: node.id.toString(),
            spaceId: node.spaceId,
            releaseVersionId: node.releaseVersionId,
            parentId: node.parentId,
            documentId: node.documentId,
            label: node.label,
            slug: node.slug,
            order: node.order,
            nodeType: node.nodeType,
            externalUrl: node.externalUrl,
            createdAt: node.createdAt.toISOString(),
            updatedAt: node.updatedAt.toISOString(),
        };
    }

    static toTreeHTTP(items: NavigationTreeNode[]) {
        return items.map((item) => ({
            id: item.id,
            spaceId: item.spaceId,
            releaseVersionId: item.releaseVersionId,
            parentId: item.parentId,
            documentId: item.documentId,
            label: item.label,
            slug: item.slug,
            order: item.order,
            nodeType: item.nodeType,
            externalUrl: item.externalUrl,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
            children: NavigationPresenter.toTreeHTTP(item.children),
        }));
    }
}
