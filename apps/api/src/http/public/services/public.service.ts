import type { DocumentContent } from "@emerald/contracts";
import { Injectable, NotFoundException } from "@nestjs/common";
import { DocumentStatus, ReleaseVersionStatus } from "@prisma/client";

import { NavigationNodeEntity, type NavigationTreeNode } from "@/domain/navigation/enterprise/entities/navigation-node.entity";
import { PrismaNavigationMapper } from "@/infra/database/mappers/prisma/prisma-navigation.mapper";
import { PrismaReleaseVersionMapper } from "@/infra/database/mappers/prisma/prisma-release-version.mapper";
import { PrismaService } from "@/infra/database/prisma/prisma.service";

interface SearchDocumentRow {
    id: string;
    title: string;
    slug: string;
    space: { key: string };
    releaseVersion: { key: string };
    currentRevision: { plainText: string | null } | null;
}

@Injectable()
export class PublicService {
    constructor(private readonly prisma: PrismaService) {}

    async findVersions(spaceKey: string) {
        const versions = await this.prisma.releaseVersion.findMany({
            where: {
                space: {
                    key: spaceKey,
                },
                status: ReleaseVersionStatus.PUBLISHED,
            },
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        });

        return {
            space: spaceKey,
            versions: versions.map((version) => ({
                id: version.id,
                key: version.key,
                label: version.label,
                status: PrismaReleaseVersionMapper.fromPrismaStatus(version.status),
                isDefault: version.isDefault,
                publishedAt: version.publishedAt?.toISOString() ?? null,
                createdAt: version.createdAt.toISOString(),
                updatedAt: version.updatedAt.toISOString(),
            })),
        };
    }

    async findNavigation(spaceKey: string, versionKey: string) {
        const releaseVersion = await this.prisma.releaseVersion.findFirst({
            where: {
                key: versionKey,
                status: ReleaseVersionStatus.PUBLISHED,
                space: {
                    key: spaceKey,
                },
            },
            select: {
                id: true,
                spaceId: true,
            },
        });

        if (!releaseVersion) {
            throw new NotFoundException("Navigation not found");
        }

        const nodes = await this.prisma.navigationNode.findMany({
            where: {
                spaceId: releaseVersion.spaceId,
                OR: [{ releaseVersionId: releaseVersion.id }, { releaseVersionId: null }],
            },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        });

        const tree = NavigationNodeEntity.buildTree(nodes.map((node) => PrismaNavigationMapper.toDomain(node)));

        return {
            space: spaceKey,
            version: versionKey,
            items: tree.map((item) => this.toPublicNavigationTree(item)),
        };
    }

    async findDocument(spaceKey: string, versionKey: string, slug: string) {
        const document = await this.prisma.document.findFirst({
            where: {
                slug,
                status: DocumentStatus.PUBLISHED,
                space: {
                    key: spaceKey,
                },
                releaseVersion: {
                    key: versionKey,
                    status: ReleaseVersionStatus.PUBLISHED,
                },
            },
            include: {
                space: true,
                releaseVersion: true,
                currentRevision: true,
            },
        });

        if (!document) {
            throw new NotFoundException("Document not found");
        }

        return {
            document: {
                id: document.id,
                title: document.title,
                slug: document.slug,
                space: document.space.key,
                version: document.releaseVersion.key,
                status: PublicService.toPublicDocumentStatus(document.status),
                content_json: (document.currentRevision?.contentJson as DocumentContent | null) ?? null,
                rendered_html: document.currentRevision?.renderedHtml ?? "",
                updatedAt: document.updatedAt.toISOString(),
            },
        };
    }

    async search(rawQuery: string) {
        const query = this.normalizeQuery(rawQuery);

        if (!query) {
            return {
                query,
                results: [],
                totalCount: 0,
            };
        }

        const documents = await this.prisma.document.findMany({
            where: {
                status: DocumentStatus.PUBLISHED,
                releaseVersion: {
                    status: ReleaseVersionStatus.PUBLISHED,
                },
                OR: [
                    {
                        title: {
                            contains: query,
                            mode: "insensitive",
                        },
                    },
                    {
                        currentRevision: {
                            is: {
                                plainText: {
                                    contains: query,
                                    mode: "insensitive",
                                },
                            },
                        },
                    },
                ],
            },
            select: {
                id: true,
                title: true,
                slug: true,
                space: {
                    select: {
                        key: true,
                    },
                },
                releaseVersion: {
                    select: {
                        key: true,
                    },
                },
                currentRevision: {
                    select: {
                        plainText: true,
                    },
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
            take: 20,
        });

        const results = documents.map((document) => this.toPublicSearchResult(document, query));

        return {
            query,
            results,
            totalCount: results.length,
        };
    }

    private toPublicNavigationTree(item: NavigationTreeNode) {
        return {
            id: item.id,
            parentId: item.parentId,
            documentId: item.documentId,
            label: item.label,
            slug: item.slug,
            order: item.order,
            nodeType: item.nodeType,
            externalUrl: item.externalUrl,
            children: item.children.map((child) => this.toPublicNavigationTree(child)),
        };
    }

    private toPublicSearchResult(document: SearchDocumentRow, query: string) {
        const source = document.currentRevision?.plainText || document.title;

        return {
            id: document.id,
            title: document.title,
            slug: document.slug,
            space: document.space.key,
            version: document.releaseVersion.key,
            snippet: this.buildSnippet(source, query),
        };
    }

    private buildSnippet(source: string, query: string): string {
        const normalizedSource = source.replace(/\s+/g, " ").trim();
        const sourceLower = normalizedSource.toLowerCase();
        const queryLower = query.toLowerCase();
        const index = sourceLower.indexOf(queryLower);

        if (index < 0) {
            return normalizedSource.slice(0, 160);
        }

        const snippetStart = Math.max(0, index - 60);
        const snippetEnd = Math.min(normalizedSource.length, index + query.length + 60);
        const snippet = normalizedSource.slice(snippetStart, snippetEnd).trim();

        const hasPrefix = snippetStart > 0;
        const hasSuffix = snippetEnd < normalizedSource.length;

        return `${hasPrefix ? "…" : ""}${snippet}${hasSuffix ? "…" : ""}`;
    }

    private normalizeQuery(query: string): string {
        return query.normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 160);
    }

    private static toPublicDocumentStatus(status: DocumentStatus): "draft" | "published" | "archived" {
        if (status === DocumentStatus.DRAFT) {
            return "draft";
        }

        if (status === DocumentStatus.ARCHIVED) {
            return "archived";
        }

        return "published";
    }
}
