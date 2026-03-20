import { PrismaSpaceMapper } from "./prisma-space.mapper";

describe("PrismaSpaceMapper", () => {
    it("maps a prisma space row to a response payload", () => {
        const now = new Date("2026-03-20T12:00:00.000Z");

        const response = PrismaSpaceMapper.toResponse({
            id: "f7c9dd85-9259-47d7-9f96-669f9e39f570",
            key: "guides",
            name: "Guides",
            description: "Product and developer guides",
            createdAt: now,
            updatedAt: now,
        });

        expect(response).toEqual({
            id: "f7c9dd85-9259-47d7-9f96-669f9e39f570",
            key: "guides",
            name: "Guides",
            description: "Product and developer guides",
            createdAt: "2026-03-20T12:00:00.000Z",
            updatedAt: "2026-03-20T12:00:00.000Z",
        });
    });
});
