export class FileTooLargeError extends Error {
    constructor(actualSizeBytes: number, maxSizeBytes: number) {
        const actualMB = Math.round((actualSizeBytes / 1024 / 1024) * 100) / 100;
        const maxMB = Math.round((maxSizeBytes / 1024 / 1024) * 100) / 100;
        super(`File size (${actualMB}MB) exceeds maximum allowed size (${maxMB}MB)`);
        this.name = "FileTooLargeError";
    }
}
