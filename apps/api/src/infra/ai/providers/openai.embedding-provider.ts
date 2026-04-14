import type { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

import type { EmbeddingProvider, EmbedOptions } from "@/domain/ai-context/application/providers/embedding-provider";
import { EmbeddingProviderError } from "@/domain/ai-context/application/providers/embedding-provider.error";
import type { Env } from "@/env/env";

// OpenAI accepts at most 2048 inputs per `embeddings.create` request.
// Larger payloads are split transparently into sequential batches.
const OPENAI_MAX_BATCH_SIZE = 2048;

export class OpenAiEmbeddingProvider implements EmbeddingProvider {
    readonly name = "openai" as const;
    readonly dimension: number;

    private readonly client: OpenAI;
    private readonly model: string;

    constructor(configService: ConfigService<Env, true>) {
        const apiKey = configService.get("OPENAI_API_KEY", { infer: true });
        const model = configService.get("OPENAI_EMBEDDING_MODEL", { infer: true });
        const dimension = configService.get("EMBEDDING_DIMENSION", { infer: true });

        this.client = new OpenAI({ apiKey });
        this.model = model ?? "text-embedding-3-small";
        this.dimension = dimension ?? 1536;
    }

    /**
     * Generates embeddings for the given texts.
     *
     * Note: OpenAI embedding models do NOT distinguish between "document" and "query"
     * input types (unlike Voyage). The `options.inputType` field is therefore ignored
     * here, and both semantic search queries and indexed documents share the same
     * embedding space for this provider.
     */
    async embed(texts: string[], _options: EmbedOptions): Promise<number[][]> {
        if (texts.length === 0) {
            return [];
        }

        try {
            const results: number[][] = [];

            for (let start = 0; start < texts.length; start += OPENAI_MAX_BATCH_SIZE) {
                const batch = texts.slice(start, start + OPENAI_MAX_BATCH_SIZE);

                const response = await this.client.embeddings.create({
                    model: this.model,
                    input: batch,
                    dimensions: this.dimension,
                    encoding_format: "float",
                });

                // OpenAI documents that `data` is returned in input order, but the
                // API also provides an `index` field. We sort defensively to
                // guarantee ordering regardless of any future non-determinism.
                const ordered = [...response.data].sort((a, b) => a.index - b.index);

                for (const item of ordered) {
                    results.push(item.embedding as number[]);
                }
            }

            return results;
        } catch (error) {
            throw new EmbeddingProviderError(this.name, error instanceof Error ? error.message : String(error), error);
        }
    }
}
