import { DocumentContentSchema } from "@emerald/contracts";
import { Injectable } from "@nestjs/common";
import { DocumentStatus, Prisma } from "@prisma/client";

import {
    CreateDocumentParams,
    CreateRevisionParams,
    DocumentsRepository,
    FindBySlugParams,
    ListDocumentsParams,
    ListDocumentsResult,
    UpdateDocumentParams,
} from "@/domain/documents/application/repositories/documents.repository";
import { renderDocumentContent } from "@/domain/documents/application/utils/document-content-renderer";
import { DocumentEntity } from "@/domain/documents/enterprise/entities/document.entity";
import { DocumentRevisionEntity } from "@/domain/documents/enterprise/entities/document-revision.entity";
import { PrismaDocumentMapper } from "@/infra/database/mappers/prisma/prisma-document.mapper";
import { PrismaService } from "@/infra/database/prisma/prisma.service";

const documentRelations = {
    include: {
        space: true,
        currentRevision: true,
    },
} as const;

@Injectable()
export class PrismaDocumentsRepository implements DocumentsRepository {
    constructor(private prisma: PrismaService) {}

    async findById(id: string): Promise<DocumentEntity | null> {
        const document = await this.prisma.document.findUnique({
            where: { id },
            ...documentRelations,
        });

        if (!document) {
            return null;
        }

        return PrismaDocumentMapper.toDomain(document);
    }

    async findBySlugInVersion(params: FindBySlugParams): Promise<DocumentEntity | null> {
        const document = await this.prisma.document.findUnique({
            where: {
                spaceId_slug_releaseVersionId: {
                    spaceId: params.spaceId,
                    slug: params.slug,
                    releaseVersionId: params.releaseVersionId,
                },
            },
            ...documentRelations,
        });

        if (!document) {
            return null;
        }

        return PrismaDocumentMapper.toDomain(document);
    }

    async listBySpaceId(params: ListDocumentsParams): Promise<ListDocumentsResult> {
        const [documents, total] = await this.prisma.$transaction([
            this.prisma.document.findMany({
                where: { spaceId: params.spaceId },
                skip: (params.page - 1) * params.limit,
                take: params.limit,
                orderBy: { updatedAt: "desc" },
                ...documentRelations,
            }),
            this.prisma.document.count({
                where: { spaceId: params.spaceId },
            }),
        ]);

        return {
            documents: documents.map((document) => PrismaDocumentMapper.toDomain(document)),
            total,
        };
    }

    async create(params: CreateDocumentParams): Promise<DocumentEntity> {
        const parsedContent = DocumentContentSchema.safeParse(params.contentJson);
        const rendered = parsedContent.success ? renderDocumentContent(parsedContent.data) : null;

        const document = await this.prisma.$transaction(async (tx) => {
            const createdDocument = await tx.document.create({
                data: {
                    spaceId: params.spaceId,
                    releaseVersionId: params.releaseVersionId,
                    title: params.title,
                    slug: params.slug,
                    status: DocumentStatus.DRAFT,
                    createdBy: params.createdBy,
                    updatedBy: params.createdBy,
                },
            });

            const createdRevision = await tx.documentRevision.create({
                data: {
                    documentId: createdDocument.id,
                    revisionNumber: 1,
                    contentJson: params.contentJson as Prisma.InputJsonValue,
                    renderedHtml: rendered?.renderedHtml ?? "",
                    plainText: rendered?.plainText ?? "",
                    createdBy: params.createdBy,
                    changeNote: "Initial revision",
                },
            });

            return tx.document.update({
                where: { id: createdDocument.id },
                data: {
                    currentRevisionId: createdRevision.id,
                },
                ...documentRelations,
            });
        });

        return PrismaDocumentMapper.toDomain(document);
    }

    async update(params: UpdateDocumentParams): Promise<DocumentEntity | null> {
        const existingDocument = await this.prisma.document.findUnique({
            where: { id: params.documentId },
            select: { id: true },
        });

        if (!existingDocument) {
            return null;
        }

        const updatedDocument = await this.prisma.$transaction(async (tx) => {
            const data: {
                title?: string;
                updatedBy: string;
                currentRevisionId?: string;
                status?: DocumentStatus;
            } = {
                updatedBy: params.updatedBy,
            };

            if (params.title !== undefined) {
                data.title = params.title;
                data.status = DocumentStatus.DRAFT;
            }

            if (params.contentJson) {
                const parsedUpdateContent = DocumentContentSchema.safeParse(params.contentJson);
                const renderedUpdate = parsedUpdateContent.success
                    ? renderDocumentContent(parsedUpdateContent.data)
                    : null;

                const latestRevision = await tx.documentRevision.findFirst({
                    where: { documentId: params.documentId },
                    orderBy: { revisionNumber: "desc" },
                    select: { revisionNumber: true },
                });

                const createdRevision = await tx.documentRevision.create({
                    data: {
                        documentId: params.documentId,
                        revisionNumber: (latestRevision?.revisionNumber ?? 0) + 1,
                        contentJson: params.contentJson as Prisma.InputJsonValue,
                        renderedHtml: renderedUpdate?.renderedHtml ?? "",
                        plainText: renderedUpdate?.plainText ?? "",
                        createdBy: params.updatedBy,
                        changeNote: "Document update",
                    },
                });

                data.currentRevisionId = createdRevision.id;
                data.status = DocumentStatus.DRAFT;
            }

            return tx.document.update({
                where: { id: params.documentId },
                data,
                ...documentRelations,
            });
        });

        return PrismaDocumentMapper.toDomain(updatedDocument);
    }

    async publish(documentId: string, updatedBy: string): Promise<DocumentEntity | null> {
        const existingDocument = await this.prisma.document.findUnique({
            where: { id: documentId },
            ...documentRelations,
        });

        if (!existingDocument) {
            return null;
        }

        if (existingDocument.status === DocumentStatus.PUBLISHED) {
            return PrismaDocumentMapper.toDomain(existingDocument);
        }

        const parsedContent = DocumentContentSchema.safeParse(existingDocument.currentRevision?.contentJson);
        const rendered = parsedContent.success ? renderDocumentContent(parsedContent.data) : null;

        const publishedDocument = await this.prisma.$transaction(async (tx) => {
            if (existingDocument.currentRevisionId) {
                await tx.documentRevision.update({
                    where: {
                        id: existingDocument.currentRevisionId,
                    },
                    data: {
                        renderedHtml: rendered?.renderedHtml ?? existingDocument.currentRevision?.renderedHtml ?? "",
                        plainText: rendered?.plainText ?? existingDocument.currentRevision?.plainText ?? "",
                    },
                });
            }

            return tx.document.update({
                where: { id: documentId },
                data: {
                    status: DocumentStatus.PUBLISHED,
                    updatedBy,
                },
                ...documentRelations,
            });
        });

        return PrismaDocumentMapper.toDomain(publishedDocument);
    }

    async unpublish(documentId: string, updatedBy: string): Promise<DocumentEntity | null> {
        const existingDocument = await this.prisma.document.findUnique({
            where: { id: documentId },
            ...documentRelations,
        });

        if (!existingDocument) {
            return null;
        }

        if (existingDocument.status === DocumentStatus.DRAFT) {
            return PrismaDocumentMapper.toDomain(existingDocument);
        }

        const updatedDocument = await this.prisma.document.update({
            where: { id: documentId },
            data: {
                status: DocumentStatus.DRAFT,
                updatedBy,
            },
            ...documentRelations,
        });

        return PrismaDocumentMapper.toDomain(updatedDocument);
    }

    async createRevision(params: CreateRevisionParams): Promise<DocumentRevisionEntity | null> {
        const existingDocument = await this.prisma.document.findUnique({
            where: { id: params.documentId },
            select: { id: true },
        });

        if (!existingDocument) {
            return null;
        }

        const parsedContent = DocumentContentSchema.safeParse(params.contentJson);
        const rendered = parsedContent.success ? renderDocumentContent(parsedContent.data) : null;

        const createdRevision = await this.prisma.$transaction(async (tx) => {
            const latestRevision = await tx.documentRevision.findFirst({
                where: { documentId: params.documentId },
                orderBy: { revisionNumber: "desc" },
                select: { revisionNumber: true },
            });

            const revision = await tx.documentRevision.create({
                data: {
                    documentId: params.documentId,
                    revisionNumber: (latestRevision?.revisionNumber ?? 0) + 1,
                    contentJson: params.contentJson as Prisma.InputJsonValue,
                    renderedHtml: rendered?.renderedHtml ?? "",
                    plainText: rendered?.plainText ?? "",
                    createdBy: params.createdBy,
                    changeNote: params.changeNote,
                },
            });

            await tx.document.update({
                where: { id: params.documentId },
                data: {
                    currentRevisionId: revision.id,
                    updatedBy: params.createdBy,
                },
            });

            return revision;
        });

        return PrismaDocumentMapper.toRevisionDomain(createdRevision);
    }

    async findRevisions(documentId: string): Promise<DocumentRevisionEntity[]> {
        const revisions = await this.prisma.documentRevision.findMany({
            where: { documentId },
            orderBy: { revisionNumber: "desc" },
        });

        return revisions.map((revision) => PrismaDocumentMapper.toRevisionDomain(revision));
    }
}
