import { Injectable } from "@nestjs/common";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

import {
    IFileValidatorProvider,
    ImageDimensions,
    ValidationOptions,
    ValidationResult,
} from "@/domain/storage/application/providers/file-validator.provider";

@Injectable()
export class FileValidatorProvider implements IFileValidatorProvider {
    private readonly defaultAllowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/avif",
        "application/pdf",
    ];

    async validateMimeType(buffer: Buffer, allowedTypes?: string[]): Promise<ValidationResult> {
        const detectedType = await this.detectMimeType(buffer);

        if (!detectedType) {
            return {
                isValid: false,
                error: "Could not detect file type. File may be corrupted or unsupported.",
            };
        }

        const allowed = allowedTypes ?? this.defaultAllowedMimeTypes;

        if (!allowed.includes(detectedType)) {
            return {
                isValid: false,
                error: `File type '${detectedType}' is not allowed. Allowed types: ${allowed.join(", ")}`,
                detectedMimeType: detectedType,
            };
        }

        return {
            isValid: true,
            detectedMimeType: detectedType,
        };
    }

    validateSize(sizeBytes: number, maxSizeBytes: number): ValidationResult {
        if (sizeBytes > maxSizeBytes) {
            const maxSizeMB = Math.round((maxSizeBytes / 1024 / 1024) * 100) / 100;
            const actualSizeMB = Math.round((sizeBytes / 1024 / 1024) * 100) / 100;

            return {
                isValid: false,
                error: `File size (${actualSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
            };
        }

        return { isValid: true };
    }

    async validateDimensions(buffer: Buffer, options: ValidationOptions): Promise<ValidationResult> {
        const dimensions = await this.getImageDimensions(buffer);

        if (!dimensions) {
            return {
                isValid: false,
                error: "Could not read image dimensions. File may not be a valid image.",
            };
        }

        if (options.minWidth && dimensions.width < options.minWidth) {
            return {
                isValid: false,
                error: `Image width (${dimensions.width}px) is less than minimum (${options.minWidth}px)`,
            };
        }

        if (options.maxWidth && dimensions.width > options.maxWidth) {
            return {
                isValid: false,
                error: `Image width (${dimensions.width}px) exceeds maximum (${options.maxWidth}px)`,
            };
        }

        if (options.minHeight && dimensions.height < options.minHeight) {
            return {
                isValid: false,
                error: `Image height (${dimensions.height}px) is less than minimum (${options.minHeight}px)`,
            };
        }

        if (options.maxHeight && dimensions.height > options.maxHeight) {
            return {
                isValid: false,
                error: `Image height (${dimensions.height}px) exceeds maximum (${options.maxHeight}px)`,
            };
        }

        return { isValid: true };
    }

    async getImageDimensions(buffer: Buffer): Promise<ImageDimensions | null> {
        try {
            const metadata = await sharp(buffer).metadata();

            if (metadata.width && metadata.height) {
                return {
                    width: metadata.width,
                    height: metadata.height,
                };
            }

            return null;
        } catch {
            return null;
        }
    }

    async validate(buffer: Buffer, options: ValidationOptions): Promise<ValidationResult> {
        // Validate MIME type
        const mimeResult = await this.validateMimeType(buffer, options.allowedMimeTypes);
        if (!mimeResult.isValid) {
            return mimeResult;
        }

        // Validate size
        if (options.maxSizeBytes) {
            const sizeResult = this.validateSize(buffer.length, options.maxSizeBytes);
            if (!sizeResult.isValid) {
                return sizeResult;
            }
        }

        // Validate dimensions for images
        const isImage = mimeResult.detectedMimeType?.startsWith("image/");
        const hasDimensionConstraints = options.minWidth || options.maxWidth || options.minHeight || options.maxHeight;

        if (isImage && hasDimensionConstraints) {
            const dimensionResult = await this.validateDimensions(buffer, options);
            if (!dimensionResult.isValid) {
                return dimensionResult;
            }
        }

        return {
            isValid: true,
            detectedMimeType: mimeResult.detectedMimeType,
        };
    }

    async detectMimeType(buffer: Buffer): Promise<string | null> {
        const result = await fileTypeFromBuffer(buffer);
        return result?.mime ?? null;
    }
}
