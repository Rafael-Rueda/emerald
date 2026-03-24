import { DocumentResponseSchema } from "@emerald/contracts";
import {
    type DocumentRevision,
    DocumentStatus,
    type ReleaseVersion,
    ReleaseVersionStatus,
    type Space,
} from "@prisma/client";

import { PrismaDocumentMapper } from "./prisma-document.mapper";

describe("PrismaDocumentMapper", () => {
    it("serializes the space field as the space key string", () => {
        const now = new Date("2026-03-20T12:00:00.000Z");

        const space: Space = {
            id: "f7c9dd85-9259-47d7-9f96-669f9e39f570",
            key: "guides",
            name: "Guides",
            description: "Product and developer guides",
            createdAt: now,
            updatedAt: now,
        };

        const releaseVersion: ReleaseVersion = {
            id: "2f9b5765-18fb-41e9-b3bc-14cb4293186b",
            spaceId: space.id,
            key: "v1",
            label: "Version 1",
            status: ReleaseVersionStatus.PUBLISHED,
            isDefault: true,
            publishedAt: now,
            createdAt: now,
            updatedAt: now,
        };

        const currentRevision: DocumentRevision = {
            id: "31f57cae-8ae6-4678-ac6d-86c3753e87de",
            documentId: "7b68956f-96f4-4ab7-b2d9-c9e5764bdd9f",
            revisionNumber: 1,
            contentJson: {
                type: "doc",
                version: 1,
                children: [],
            },
            renderedHtml: "<p>Hello from Emerald</p>",
            plainText: "Hello from Emerald",
            changeNote: "Initial content",
            createdBy: "f54f2fa4-9ca8-4f58-a43f-6a7410d7f6c4",
            createdAt: now,
        };

        const response = PrismaDocumentMapper.toDocumentResponse({
            id: "7b68956f-96f4-4ab7-b2d9-c9e5764bdd9f",
            spaceId: "f7c9dd85-9259-47d7-9f96-669f9e39f570",
            releaseVersionId: releaseVersion.id,
            title: "Getting Started",
            slug: "getting-started",
            status: DocumentStatus.PUBLISHED,
            currentRevisionId: currentRevision.id,
            createdBy: "f54f2fa4-9ca8-4f58-a43f-6a7410d7f6c4",
            updatedBy: "f54f2fa4-9ca8-4f58-a43f-6a7410d7f6c4",
            createdAt: now,
            updatedAt: now,
            space,
            releaseVersion,
            currentRevision,
        });

        expect(response.document.space).toBe("guides");
        expect(response.document.space).not.toBe("f7c9dd85-9259-47d7-9f96-669f9e39f570");
        expect(DocumentResponseSchema.safeParse(response).success).toBe(true);
    });
});
