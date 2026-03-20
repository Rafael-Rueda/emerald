import { Readable } from "stream";

export interface UploadOptions {
    path: string;
    mimeType: string;
    metadata?: Record<string, string>;
}

export interface UploadResult {
    path: string;
    publicUrl: string;
    size: number;
}

export interface IStorageProvider {
    /**
     * Upload a file using streams (for large files)
     */
    uploadStream(stream: Readable, options: UploadOptions): Promise<UploadResult>;

    /**
     * Upload a file from buffer (for small files)
     */
    uploadBuffer(buffer: Buffer, options: UploadOptions): Promise<UploadResult>;

    /**
     * Delete a file from storage
     */
    delete(path: string): Promise<void>;

    /**
     * Check if a file exists
     */
    exists(path: string): Promise<boolean>;

    /**
     * Get a signed URL for temporary access
     */
    getSignedUrl(path: string, expiresInMinutes?: number): Promise<string>;

    /**
     * Get the public URL for a file
     */
    getPublicUrl(path: string): string;

    /**
     * Copy a file to a new location (used for versioning)
     */
    copy(sourcePath: string, destinationPath: string): Promise<void>;
}
