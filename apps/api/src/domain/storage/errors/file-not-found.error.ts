export class FileNotFoundError extends Error {
    constructor(identifier?: string) {
        super(identifier ? `File '${identifier}' not found` : "File not found");
        this.name = "FileNotFoundError";
    }
}
