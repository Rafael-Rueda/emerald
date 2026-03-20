export class InvalidImageDimensionsError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidImageDimensionsError";
    }
}
