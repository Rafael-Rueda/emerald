export interface ValidationResult {
    isValid: boolean;
    error?: string;
    detectedMimeType?: string;
}

export interface ValidationOptions {
    allowedMimeTypes?: string[];
    maxSizeBytes?: number;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
}

export interface ImageDimensions {
    width: number;
    height: number;
}

export interface IFileValidatorProvider {
    /**
     * Validate file using magic bytes to detect real MIME type
     */
    validateMimeType(buffer: Buffer, allowedTypes?: string[]): Promise<ValidationResult>;

    /**
     * Validate file size
     */
    validateSize(sizeBytes: number, maxSizeBytes: number): ValidationResult;

    /**
     * Validate image dimensions
     */
    validateDimensions(buffer: Buffer, options: ValidationOptions): Promise<ValidationResult>;

    /**
     * Get image dimensions from buffer
     */
    getImageDimensions(buffer: Buffer): Promise<ImageDimensions | null>;

    /**
     * Complete validation (MIME + size + dimensions for images)
     */
    validate(buffer: Buffer, options: ValidationOptions): Promise<ValidationResult>;

    /**
     * Detect real MIME type using magic bytes
     */
    detectMimeType(buffer: Buffer): Promise<string | null>;
}
