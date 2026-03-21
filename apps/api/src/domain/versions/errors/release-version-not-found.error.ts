export class ReleaseVersionNotFoundError extends Error {
    constructor() {
        super("Release version not found");
        this.name = "ReleaseVersionNotFoundError";
    }
}
