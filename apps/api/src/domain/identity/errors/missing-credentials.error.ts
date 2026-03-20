export class MissingCredentialsError extends Error {
    constructor(field: string) {
        super(`Missing required field: ${field}`);
        this.name = "MissingCredentialsError";
    }
}
