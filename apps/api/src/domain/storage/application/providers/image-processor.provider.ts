export interface ResizeOptions {
    width?: number;
    height?: number;
    fit?: "cover" | "contain" | "fill" | "inside" | "outside";
    quality?: number;
    format?: "jpeg" | "png" | "webp" | "avif";
}

export interface ProcessedImage {
    buffer: Buffer;
    width: number;
    height: number;
    size: number;
    mimeType: string;
}

export interface ThumbnailConfig {
    name: string;
    width: number;
    height: number;
    fit?: "cover" | "contain" | "fill" | "inside" | "outside";
}

export interface IImageProcessorProvider {
    /**
     * Resize an image
     */
    resize(buffer: Buffer, options: ResizeOptions): Promise<ProcessedImage>;

    /**
     * Generate multiple thumbnails
     */
    generateThumbnails(buffer: Buffer, configs: ThumbnailConfig[]): Promise<Map<string, ProcessedImage>>;

    /**
     * Optimize image without resizing (compression only)
     */
    optimize(buffer: Buffer, quality?: number): Promise<ProcessedImage>;

    /**
     * Convert image to a different format
     */
    convert(buffer: Buffer, format: "jpeg" | "png" | "webp" | "avif", quality?: number): Promise<ProcessedImage>;

    /**
     * Check if buffer is a valid image
     */
    isValidImage(buffer: Buffer): Promise<boolean>;

    /**
     * Get image metadata (dimensions, format, etc.)
     */
    getMetadata(buffer: Buffer): Promise<{
        width: number;
        height: number;
        format: string;
        size: number;
    } | null>;
}
