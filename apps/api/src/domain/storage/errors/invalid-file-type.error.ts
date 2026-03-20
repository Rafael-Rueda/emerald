export class InvalidFileTypeError extends Error {
    constructor(detectedType?: string, allowedTypes?: string[]) {
        const message = detectedType
            ? `File type '${detectedType}' is not allowed${allowedTypes ? `. Allowed: ${allowedTypes.join(", ")}` : ""}`
            : "Invalid or unrecognized file type";
        super(message);
        this.name = "InvalidFileTypeError";
    }
}
