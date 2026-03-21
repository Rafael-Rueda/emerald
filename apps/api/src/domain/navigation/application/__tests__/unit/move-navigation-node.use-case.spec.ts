import { NAVIGATION_NODE_TYPE, NavigationNodeEntity } from "../../../enterprise/entities/navigation-node.entity";
import { NavigationCircularReferenceError } from "../../../errors/navigation-circular-reference.error";
import { NavigationNodeNotFoundError } from "../../../errors/navigation-node-not-found.error";
import { type NavigationRepository } from "../../repositories/navigation.repository";
import { MoveNavigationNodeUseCase } from "../../use-cases/move-navigation-node.use-case";

const makeNode = (
    overrides: Partial<{
        id: string;
        spaceId: string;
        parentId: string | null;
        documentId: string | null;
        label: string;
        slug: string;
        order: number;
        nodeType: "document" | "group" | "external_link";
        externalUrl: string | null;
    }> = {},
) =>
    NavigationNodeEntity.create(
        {
            spaceId: overrides.spaceId ?? "space-1",
            releaseVersionId: null,
            parentId: overrides.parentId ?? null,
            documentId: overrides.documentId ?? null,
            label: overrides.label ?? "Node",
            slug: overrides.slug ?? "node",
            order: overrides.order ?? 0,
            nodeType: overrides.nodeType ?? NAVIGATION_NODE_TYPE.GROUP,
            externalUrl: overrides.externalUrl ?? null,
        },
        overrides.id,
    );

const makeNavigationRepository = (): jest.Mocked<NavigationRepository> => ({
    findById: jest.fn(),
    listBySpaceId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    move: jest.fn(),
    delete: jest.fn(),
});

describe("MoveNavigationNodeUseCase", () => {
    let sut: MoveNavigationNodeUseCase;
    let navigationRepository: jest.Mocked<NavigationRepository>;

    beforeEach(() => {
        navigationRepository = makeNavigationRepository();
        sut = new MoveNavigationNodeUseCase(navigationRepository);
    });

    it("moves a node when target parent is not a descendant", async () => {
        const root = makeNode({ id: "root", slug: "root", parentId: null, order: 0 });
        const child = makeNode({ id: "child", slug: "child", parentId: "root", order: 0 });
        const anotherRoot = makeNode({ id: "another-root", slug: "another-root", parentId: null, order: 1 });

        navigationRepository.findById.mockResolvedValue(child);
        navigationRepository.listBySpaceId.mockResolvedValue([root, child, anotherRoot]);
        navigationRepository.move.mockResolvedValue(
            makeNode({ id: "child", slug: "child", parentId: "another-root", order: 0 }),
        );

        const result = await sut.execute({
            nodeId: "child",
            parentId: "another-root",
            order: 0,
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.node.parentId).toBe("another-root");
            expect(result.value.node.order).toBe(0);
        }
    });

    it("returns circular reference error when parentId equals the node id", async () => {
        navigationRepository.findById.mockResolvedValue(makeNode({ id: "node-1", slug: "node-1" }));
        navigationRepository.listBySpaceId.mockResolvedValue([makeNode({ id: "node-1", slug: "node-1" })]);

        const result = await sut.execute({
            nodeId: "node-1",
            parentId: "node-1",
            order: 0,
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(NavigationCircularReferenceError);
        }

        expect(navigationRepository.move).not.toHaveBeenCalled();
    });

    it("returns circular reference error when parentId is a descendant", async () => {
        const root = makeNode({ id: "root", slug: "root", parentId: null, order: 0 });
        const child = makeNode({ id: "child", slug: "child", parentId: "root", order: 0 });
        const grandchild = makeNode({ id: "grandchild", slug: "grandchild", parentId: "child", order: 0 });

        navigationRepository.findById.mockResolvedValue(root);
        navigationRepository.listBySpaceId.mockResolvedValue([root, child, grandchild]);

        const result = await sut.execute({
            nodeId: "root",
            parentId: "grandchild",
            order: 0,
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(NavigationCircularReferenceError);
        }

        expect(navigationRepository.move).not.toHaveBeenCalled();
    });

    it("returns not found when node does not exist", async () => {
        navigationRepository.findById.mockResolvedValue(null);

        const result = await sut.execute({
            nodeId: "missing-node",
            parentId: null,
            order: 0,
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(NavigationNodeNotFoundError);
        }

        expect(navigationRepository.move).not.toHaveBeenCalled();
    });
});
