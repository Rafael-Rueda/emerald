import { Storage } from "@google-cloud/storage";
import { Injectable } from "@nestjs/common";
import { Readable } from "stream";

import { IStorageProvider, UploadOptions, UploadResult } from "@/domain/storage/application/providers/storage.provider";

@Injectable()
export class GcpStorageProvider implements IStorageProvider {
    private storage: Storage;
    private bucketName: string;

    constructor(bucketName: string, keyFilePath?: string) {
        this.bucketName = bucketName;

        if (keyFilePath) {
            this.storage = new Storage({ keyFilename: keyFilePath });
        } else {
            this.storage = new Storage();
        }
    }

    private get bucket() {
        return this.storage.bucket(this.bucketName);
    }

    async uploadStream(stream: Readable, options: UploadOptions): Promise<UploadResult> {
        const file = this.bucket.file(options.path);

        return new Promise((resolve, reject) => {
            let uploadedSize = 0;

            const writeStream = file.createWriteStream({
                metadata: {
                    contentType: options.mimeType,
                    metadata: options.metadata,
                },
                resumable: true,
            });

            stream.on("data", (chunk: Buffer) => {
                uploadedSize += chunk.length;
            });

            stream.pipe(writeStream);

            writeStream.on("error", (error) => {
                reject(error);
            });

            writeStream.on("finish", () => {
                resolve({
                    path: options.path,
                    publicUrl: this.getPublicUrl(options.path),
                    size: uploadedSize,
                });
            });
        });
    }

    async uploadBuffer(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
        const file = this.bucket.file(options.path);

        await file.save(buffer, {
            metadata: {
                contentType: options.mimeType,
                metadata: options.metadata,
            },
            resumable: false,
        });

        return {
            path: options.path,
            publicUrl: this.getPublicUrl(options.path),
            size: buffer.length,
        };
    }

    async delete(path: string): Promise<void> {
        const file = this.bucket.file(path);
        const [exists] = await file.exists();

        if (exists) {
            await file.delete();
        }
    }

    async exists(path: string): Promise<boolean> {
        const file = this.bucket.file(path);
        const [exists] = await file.exists();
        return exists;
    }

    async getSignedUrl(path: string, expiresInMinutes: number = 60): Promise<string> {
        const file = this.bucket.file(path);

        const [url] = await file.getSignedUrl({
            action: "read",
            expires: Date.now() + expiresInMinutes * 60 * 1000,
        });

        return url;
    }

    getPublicUrl(path: string): string {
        return `https://storage.googleapis.com/${this.bucketName}/${path}`;
    }

    async copy(sourcePath: string, destinationPath: string): Promise<void> {
        const sourceFile = this.bucket.file(sourcePath);
        const destinationFile = this.bucket.file(destinationPath);

        await sourceFile.copy(destinationFile);
    }
}
