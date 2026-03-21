import { AggregateRoot } from "@/domain/@shared/entities/aggregate-root.entity";

export const NAVIGATION_NODE_TYPE = {
    DOCUMENT: "document",
    GROUP: "group",
    EXTERNAL_LINK: "external_link",
} as const;

export type NavigationNodeType = (typeof NAVIGATION_NODE_TYPE)[keyof typeof NAVIGATION_NODE_TYPE];

export interface NavigationNodeProps {
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

export interface NavigationTreeNode {
    id: string;
    spaceId: string;
    releaseVersionId: string | null;
    parentId: string | null;
    documentId: string | null;
    label: string;
    slug: string;
    order: number;
    nodeType: NavigationNodeType;
    externalUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
    children: NavigationTreeNode[];
}

export class NavigationNodeEntity extends AggregateRoot<NavigationNodeProps> {
    private constructor(props: NavigationNodeProps, id?: string) {
        super(props, id);
    }

    static create(props: NavigationNodeProps, id?: string) {
        return new NavigationNodeEntity(props, id);
    }

    static buildTree(nodes: NavigationNodeEntity[]): NavigationTreeNode[] {
        const idSet = new Set(nodes.map((node) => node.id.toString()));
        const childrenByParent = new Map<string | null, NavigationNodeEntity[]>();

        for (const node of nodes) {
            const parentKey = node.parentId;
            const siblings = childrenByParent.get(parentKey) ?? [];
            siblings.push(node);
            childrenByParent.set(parentKey, siblings);
        }

        const compareNodes = (a: NavigationNodeEntity, b: NavigationNodeEntity) => {
            if (a.order !== b.order) {
                return a.order - b.order;
            }

            return a.label.localeCompare(b.label);
        };

        const toTree = (parentId: string | null): NavigationTreeNode[] => {
            const children = [...(childrenByParent.get(parentId) ?? [])].sort(compareNodes);

            return children.map((node) => ({
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
                createdAt: node.createdAt,
                updatedAt: node.updatedAt,
                children: toTree(node.id.toString()),
            }));
        };

        const rootNodes = nodes
            .filter((node) => node.parentId === null || !idSet.has(node.parentId))
            .sort(compareNodes);

        return rootNodes.map((node) => ({
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
            createdAt: node.createdAt,
            updatedAt: node.updatedAt,
            children: toTree(node.id.toString()),
        }));
    }

    static collectDescendantIds(nodes: NavigationNodeEntity[], nodeId: string): Set<string> {
        const childrenByParent = new Map<string, string[]>();

        for (const node of nodes) {
            if (!node.parentId) {
                continue;
            }

            const currentChildren = childrenByParent.get(node.parentId) ?? [];
            currentChildren.push(node.id.toString());
            childrenByParent.set(node.parentId, currentChildren);
        }

        const descendants = new Set<string>();
        const queue = [...(childrenByParent.get(nodeId) ?? [])];

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (descendants.has(current)) {
                continue;
            }

            descendants.add(current);
            queue.push(...(childrenByParent.get(current) ?? []));
        }

        return descendants;
    }

    get spaceId() {
        return this.props.spaceId;
    }

    get releaseVersionId() {
        return this.props.releaseVersionId;
    }

    get parentId() {
        return this.props.parentId;
    }

    get documentId() {
        return this.props.documentId;
    }

    get label() {
        return this.props.label;
    }

    get slug() {
        return this.props.slug;
    }

    get order() {
        return this.props.order;
    }

    get nodeType() {
        return this.props.nodeType;
    }

    get externalUrl() {
        return this.props.externalUrl;
    }

    set parentId(parentId: string | null) {
        this.props.parentId = parentId;
        this.touch();
    }

    set order(order: number) {
        this.props.order = order;
        this.touch();
    }

    set label(label: string) {
        this.props.label = label;
        this.touch();
    }

    set slug(slug: string) {
        this.props.slug = slug;
        this.touch();
    }

    set documentId(documentId: string | null) {
        this.props.documentId = documentId;
        this.touch();
    }

    set nodeType(nodeType: NavigationNodeType) {
        this.props.nodeType = nodeType;
        this.touch();
    }

    set externalUrl(externalUrl: string | null) {
        this.props.externalUrl = externalUrl;
        this.touch();
    }

    private touch() {
        this.updatedAt = new Date();
    }
}
