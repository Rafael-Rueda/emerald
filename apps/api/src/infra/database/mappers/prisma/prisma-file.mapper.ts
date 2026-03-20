import type { File as PrismaFile } from "@prisma/client";

import { File } from "@/domain/storage/enterprise/entities/file.entity";
import { FileMetadata } from "@/domain/storage/enterprise/value-objects/file-metadata.vo";
import { FilePath } from "@/domain/storage/enterprise/value-objects/file-path.vo";

export class PrismaFileMapper {
    static toDomain(raw: PrismaFile): File {
        return File.create(
            {
                entityType: raw.entityType,
                entityId: raw.entityId,
                field: raw.field,
                filename: raw.filename,
                path: FilePath.fromString(raw.path),
                metadata: FileMetadata.create({
                    mimeType: raw.mimeType,
                    size: raw.size,
                    width: raw.width ?? undefined,
                    height: raw.height ?? undefined,
                }),
            },
            raw.id,
        );
    }

    static toPrisma(file: File) {
        return {
            id: file.id.toString(),
            entityType: file.entityType,
            entityId: file.entityId,
            field: file.field,
            filename: file.filename,
            path: file.path.toString(),
            mimeType: file.mimeType,
            size: file.size,
            width: file.width ?? null,
            height: file.height ?? null,
        };
    }
}
