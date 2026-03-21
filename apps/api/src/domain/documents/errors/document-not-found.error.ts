export class DocumentNotFoundError extends Error {
    constructor() {
        super("Document not found");
        this.name = "DocumentNotFoundError";
    }
}
