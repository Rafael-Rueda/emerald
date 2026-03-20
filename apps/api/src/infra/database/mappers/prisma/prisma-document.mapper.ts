import type {
    Document as PrismaDocument,
    DocumentRevision as PrismaDocumentRevision,
    ReleaseVersion as PrismaReleaseVersion,
    Space as PrismaSpace,
} from "@prisma/client";

type WorkspaceDocumentStatus = "published" | "draft" | "archived";

type DocumentWithSpace = PrismaDocument & {
    space: PrismaSpace;
};

type PublicDocumentWithRelations = DocumentWithSpace & {
    releaseVersion: PrismaReleaseVersion;
    currentRevision?: PrismaDocumentRevision | null;
};

export class PrismaDocumentMapper {
    static toWorkspaceDocument(raw: DocumentWithSpace) {
        return {
            id: raw.id,
            title: raw.title,
            slug: raw.slug,
            space: raw.space.key,
            status: this.toWorkspaceStatus(raw.status),
            updatedAt: raw.updatedAt.toISOString(),
        };
    }

    static toDocumentResponse(raw: PublicDocumentWithRelations) {
        return {
            document: {
                id: raw.id,
                title: raw.title,
                slug: raw.slug,
                space: raw.space.key,
                version: raw.releaseVersion.key,
                body: raw.currentRevision?.renderedHtml ?? "",
                headings: [],
                updatedAt: raw.updatedAt.toISOString(),
            },
        };
    }

    private static toWorkspaceStatus(status: string): WorkspaceDocumentStatus {
        return status.toLowerCase() as WorkspaceDocumentStatus;
    }
}
