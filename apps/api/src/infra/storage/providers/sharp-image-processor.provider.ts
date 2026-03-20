import { Injectable } from "@nestjs/common";
import sharp from "sharp";

import {
    IImageProcessorProvider,
    ProcessedImage,
    ResizeOptions,
    ThumbnailConfig,
} from "@/domain/storage/application/providers/image-processor.provider";

@Injectable()
export class SharpImageProcessorProvider implements IImageProcessorProvider {
    private readonly defaultQuality = 80;

    async resize(buffer: Buffer, options: ResizeOptions): Promise<ProcessedImage> {
        let pipeline = sharp(buffer);

        pipeline = pipeline.resize({
            width: options.width,
            height: options.height,
            fit: options.fit ?? "cover",
            withoutEnlargement: true,
        });

        const format = options.format ?? "jpeg";
        const quality = options.quality ?? this.defaultQuality;

        switch (format) {
            case "jpeg":
                pipeline = pipeline.jpeg({ quality });
                break;
            case "png":
                pipeline = pipeline.png({ quality });
                break;
            case "webp":
                pipeline = pipeline.webp({ quality });
                break;
            case "avif":
                pipeline = pipeline.avif({ quality });
                break;
        }

        const outputBuffer = await pipeline.toBuffer();
        const metadata = await sharp(outputBuffer).metadata();

        return {
            buffer: outputBuffer,
            width: metadata.width ?? 0,
            height: metadata.height ?? 0,
            size: outputBuffer.length,
            mimeType: `image/${format}`,
        };
    }

    async generateThumbnails(buffer: Buffer, configs: ThumbnailConfig[]): Promise<Map<string, ProcessedImage>> {
        const results = new Map<string, ProcessedImage>();

        await Promise.all(
            configs.map(async (config) => {
                const processed = await this.resize(buffer, {
                    width: config.width,
                    height: config.height,
                    fit: config.fit ?? "cover",
                });

                results.set(config.name, processed);
            }),
        );

        return results;
    }

    async optimize(buffer: Buffer, quality?: number): Promise<ProcessedImage> {
        const metadata = await sharp(buffer).metadata();
        const format = metadata.format ?? "jpeg";

        let pipeline = sharp(buffer);
        const q = quality ?? this.defaultQuality;

        switch (format) {
            case "jpeg":
            case "jpg":
                pipeline = pipeline.jpeg({ quality: q });
                break;
            case "png":
                pipeline = pipeline.png({ quality: q });
                break;
            case "webp":
                pipeline = pipeline.webp({ quality: q });
                break;
            case "avif":
                pipeline = pipeline.avif({ quality: q });
                break;
            default:
                pipeline = pipeline.jpeg({ quality: q });
        }

        const outputBuffer = await pipeline.toBuffer();
        const outputMetadata = await sharp(outputBuffer).metadata();

        return {
            buffer: outputBuffer,
            width: outputMetadata.width ?? 0,
            height: outputMetadata.height ?? 0,
            size: outputBuffer.length,
            mimeType: `image/${format === "jpg" ? "jpeg" : format}`,
        };
    }

    async convert(buffer: Buffer, format: "jpeg" | "png" | "webp" | "avif", quality?: number): Promise<ProcessedImage> {
        let pipeline = sharp(buffer);
        const q = quality ?? this.defaultQuality;

        switch (format) {
            case "jpeg":
                pipeline = pipeline.jpeg({ quality: q });
                break;
            case "png":
                pipeline = pipeline.png({ quality: q });
                break;
            case "webp":
                pipeline = pipeline.webp({ quality: q });
                break;
            case "avif":
                pipeline = pipeline.avif({ quality: q });
                break;
        }

        const outputBuffer = await pipeline.toBuffer();
        const metadata = await sharp(outputBuffer).metadata();

        return {
            buffer: outputBuffer,
            width: metadata.width ?? 0,
            height: metadata.height ?? 0,
            size: outputBuffer.length,
            mimeType: `image/${format}`,
        };
    }

    async isValidImage(buffer: Buffer): Promise<boolean> {
        try {
            await sharp(buffer).metadata();
            return true;
        } catch {
            return false;
        }
    }

    async getMetadata(buffer: Buffer): Promise<{
        width: number;
        height: number;
        format: string;
        size: number;
    } | null> {
        try {
            const metadata = await sharp(buffer).metadata();

            if (!metadata.width || !metadata.height || !metadata.format) {
                return null;
            }

            return {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                size: buffer.length,
            };
        } catch {
            return null;
        }
    }
}
