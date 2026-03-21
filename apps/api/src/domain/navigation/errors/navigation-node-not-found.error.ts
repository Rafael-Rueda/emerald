export class NavigationNodeNotFoundError extends Error {
    constructor() {
        super("Navigation node not found");
        this.name = "NavigationNodeNotFoundError";
    }
}
