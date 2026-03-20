import { Injectable } from "@nestjs/common";

import { PrismaFileMapper } from "../../mappers/prisma/prisma-file.mapper";

import { FilesRepository } from "@/domain/storage/application/repositories/files.repository";
import { File } from "@/domain/storage/enterprise/entities/file.entity";
import { PrismaService } from "@/infra/database/prisma/prisma.service";

@Injectable()
export class PrismaFilesRepository implements FilesRepository {
    constructor(private prisma: PrismaService) {}

    async findById(id: string): Promise<File | null> {
        const file = await this.prisma.file.findUnique({
            where: { id },
        });

        if (!file) return null;

        return PrismaFileMapper.toDomain(file);
    }

    async findByPath(path: string): Promise<File | null> {
        const file = await this.prisma.file.findUnique({
            where: { path },
        });

        if (!file) return null;

        return PrismaFileMapper.toDomain(file);
    }

    async findByEntity(entityType: string, entityId: string): Promise<File[]> {
        const files = await this.prisma.file.findMany({
            where: { entityType, entityId },
            orderBy: { createdAt: "desc" },
        });

        return files.map(PrismaFileMapper.toDomain);
    }

    async findByEntityAndField(entityType: string, entityId: string, field: string): Promise<File | null> {
        const file = await this.prisma.file.findFirst({
            where: { entityType, entityId, field },
        });

        if (!file) return null;

        return PrismaFileMapper.toDomain(file);
    }

    async create(file: File): Promise<File> {
        const data = PrismaFileMapper.toPrisma(file);

        const created = await this.prisma.file.create({
            data,
        });

        return PrismaFileMapper.toDomain(created);
    }

    async update(file: File): Promise<File | null> {
        const data = PrismaFileMapper.toPrisma(file);

        try {
            const updated = await this.prisma.file.update({
                where: { id: data.id },
                data: {
                    filename: data.filename,
                    path: data.path,
                    mimeType: data.mimeType,
                    size: data.size,
                    width: data.width,
                    height: data.height,
                },
            });

            return PrismaFileMapper.toDomain(updated);
        } catch {
            return null;
        }
    }

    async delete(id: string): Promise<File | null> {
        try {
            const deleted = await this.prisma.file.delete({
                where: { id },
            });

            return PrismaFileMapper.toDomain(deleted);
        } catch {
            return null;
        }
    }

    async deleteByEntity(entityType: string, entityId: string): Promise<number> {
        const result = await this.prisma.file.deleteMany({
            where: { entityType, entityId },
        });

        return result.count;
    }
}
