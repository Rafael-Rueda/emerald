export class NavigationCircularReferenceError extends Error {
    constructor() {
        super("Circular reference detected in navigation tree");
        this.name = "NavigationCircularReferenceError";
    }
}
