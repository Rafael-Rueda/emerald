export class SpaceAlreadyExistsError extends Error {
    constructor() {
        super("Space with this key already exists");
        this.name = "SpaceAlreadyExistsError";
    }
}
