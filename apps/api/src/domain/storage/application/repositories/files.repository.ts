import { File } from "../../enterprise/entities/file.entity";

export interface FilesRepository {
    /**
     * Find file by ID
     */
    findById(id: string): Promise<File | null>;

    /**
     * Find file by path
     */
    findByPath(path: string): Promise<File | null>;

    /**
     * Find files by entity (polymorphic)
     */
    findByEntity(entityType: string, entityId: string): Promise<File[]>;

    /**
     * Find file by entity and field (e.g., user's avatar)
     */
    findByEntityAndField(entityType: string, entityId: string, field: string): Promise<File | null>;

    /**
     * Create a new file record
     */
    create(file: File): Promise<File>;

    /**
     * Update file record
     */
    update(file: File): Promise<File | null>;

    /**
     * Delete file record
     */
    delete(id: string): Promise<File | null>;

    /**
     * Delete all files for an entity
     */
    deleteByEntity(entityType: string, entityId: string): Promise<number>;
}
