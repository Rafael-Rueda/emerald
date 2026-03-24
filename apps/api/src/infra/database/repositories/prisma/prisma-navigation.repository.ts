import { Injectable } from "@nestjs/common";

import {
    CreateNavigationNodeParams,
    MoveNavigationNodeParams,
    NavigationRepository,
    UpdateNavigationNodeParams,
} from "@/domain/navigation/application/repositories/navigation.repository";
import { NavigationNodeEntity } from "@/domain/navigation/enterprise/entities/navigation-node.entity";
import { PrismaNavigationMapper } from "@/infra/database/mappers/prisma/prisma-navigation.mapper";
import { PrismaService } from "@/infra/database/prisma/prisma.service";

@Injectable()
export class PrismaNavigationRepository implements NavigationRepository {
    constructor(private prisma: PrismaService) {}

    async findById(id: string): Promise<NavigationNodeEntity | null> {
        const node = await this.prisma.navigationNode.findUnique({
            where: { id },
        });

        if (!node) {
            return null;
        }

        return PrismaNavigationMapper.toDomain(node);
    }

    async listBySpaceId(spaceId: string, releaseVersionId?: string | null): Promise<NavigationNodeEntity[]> {
        const nodes = await this.prisma.navigationNode.findMany({
            where: {
                spaceId,
                ...(releaseVersionId ? { releaseVersionId } : {}),
            },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        });

        return nodes.map((node) => PrismaNavigationMapper.toDomain(node));
    }

    async create(params: CreateNavigationNodeParams): Promise<NavigationNodeEntity> {
        const node = await this.prisma.navigationNode.create({
            data: {
                spaceId: params.spaceId,
                releaseVersionId: params.releaseVersionId,
                parentId: params.parentId,
                documentId: params.documentId,
                label: params.label,
                slug: params.slug,
                order: params.order,
                nodeType: PrismaNavigationMapper.toPrismaNodeType(params.nodeType),
                externalUrl: params.externalUrl,
            },
        });

        return PrismaNavigationMapper.toDomain(node);
    }

    async update(params: UpdateNavigationNodeParams): Promise<NavigationNodeEntity | null> {
        try {
            const node = await this.prisma.navigationNode.update({
                where: { id: params.nodeId },
                data: {
                    parentId: params.parentId,
                    documentId: params.documentId,
                    label: params.label,
                    slug: params.slug,
                    order: params.order,
                    nodeType: params.nodeType ? PrismaNavigationMapper.toPrismaNodeType(params.nodeType) : undefined,
                    externalUrl: params.externalUrl,
                },
            });

            return PrismaNavigationMapper.toDomain(node);
        } catch {
            return null;
        }
    }

    async move(params: MoveNavigationNodeParams): Promise<NavigationNodeEntity | null> {
        try {
            const existing = await this.prisma.navigationNode.findUnique({
                where: { id: params.nodeId },
            });

            if (!existing) {
                return null;
            }

            const targetParentId = params.parentId ?? null;
            const targetOrder = params.order;

            return await this.prisma.$transaction(async (tx) => {
                // Remove from old position: shift down siblings that were after it
                await tx.navigationNode.updateMany({
                    where: {
                        spaceId: existing.spaceId,
                        parentId: existing.parentId,
                        id: { not: existing.id },
                        order: { gt: existing.order },
                    },
                    data: { order: { decrement: 1 } },
                });

                // Make room at target position: shift up siblings at or after target order
                await tx.navigationNode.updateMany({
                    where: {
                        spaceId: existing.spaceId,
                        parentId: targetParentId,
                        id: { not: existing.id },
                        order: { gte: targetOrder },
                    },
                    data: { order: { increment: 1 } },
                });

                // Place the node at target position
                const moved = await tx.navigationNode.update({
                    where: { id: params.nodeId },
                    data: {
                        parentId: targetParentId,
                        order: targetOrder,
                    },
                });

                return PrismaNavigationMapper.toDomain(moved);
            });
        } catch {
            return null;
        }
    }

    async delete(nodeId: string): Promise<NavigationNodeEntity | null> {
        try {
            const node = await this.prisma.navigationNode.delete({
                where: { id: nodeId },
            });

            return PrismaNavigationMapper.toDomain(node);
        } catch {
            return null;
        }
    }
}
