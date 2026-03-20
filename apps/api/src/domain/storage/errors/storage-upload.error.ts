export class StorageUploadError extends Error {
    constructor(reason?: string) {
        super(reason ? `Failed to upload file: ${reason}` : "Failed to upload file to storage");
        this.name = "StorageUploadError";
    }
}
