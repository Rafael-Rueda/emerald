export class ReleaseVersionKeyAlreadyExistsError extends Error {
    constructor() {
        super("Release version key already exists in this space");
        this.name = "ReleaseVersionKeyAlreadyExistsError";
    }
}
