export type EmbeddingInputType = "document" | "query";

export interface EmbedOptions {
    inputType: EmbeddingInputType;
}

export interface EmbeddingProvider {
    readonly name: "voyage" | "openai" | "google" | "ollama";
    readonly dimension: number;
    embed(texts: string[], options: EmbedOptions): Promise<number[][]>;
}

export const EMBEDDING_PROVIDER = "EmbeddingProvider";
