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

    async listBySpaceId(spaceId: string): Promise<NavigationNodeEntity[]> {
        const nodes = await this.prisma.navigationNode.findMany({
            where: { spaceId },
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
            const node = await this.prisma.navigationNode.update({
                where: { id: params.nodeId },
                data: {
                    parentId: params.parentId,
                    order: params.order,
                },
            });

            return PrismaNavigationMapper.toDomain(node);
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
