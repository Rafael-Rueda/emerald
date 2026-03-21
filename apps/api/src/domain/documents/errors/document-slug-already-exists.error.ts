export class DocumentSlugAlreadyExistsError extends Error {
    constructor() {
        super("Document slug already exists in this space and version");
        this.name = "DocumentSlugAlreadyExistsError";
    }
}
