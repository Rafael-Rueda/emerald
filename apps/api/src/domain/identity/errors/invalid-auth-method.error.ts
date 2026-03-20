export class InvalidAuthMethodError extends Error {
    constructor(method: string) {
        super(`Invalid auth method: "${method}"`);
        this.name = "InvalidAuthMethodError";
    }
}
