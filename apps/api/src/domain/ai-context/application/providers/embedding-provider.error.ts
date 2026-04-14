export class EmbeddingProviderError extends Error {
    constructor(
        public readonly provider: string,
        message: string,
        cause?: unknown,
    ) {
        super(`[${provider}] ${message}`);
        this.name = "EmbeddingProviderError";
        if (cause !== undefined) {
            (this as { cause?: unknown }).cause = cause;
        }
    }
}
