import { File } from "@/domain/storage/enterprise/entities/file.entity";

export class FilePresenter {
    static toHTTP(file: File) {
        return {
            id: file.id.toString(),
            entityType: file.entityType,
            entityId: file.entityId,
            field: file.field,
            filename: file.filename,
            path: file.path.toString(),
            mimeType: file.mimeType,
            size: file.size,
            width: file.width,
            height: file.height,
            isImage: file.isImage,
            createdAt: file.createdAt.toISOString(),
            updatedAt: file.updatedAt.toISOString(),
        };
    }
}
