import type { ConfigService } from "@nestjs/config";

import type { EmbeddingProvider, EmbedOptions } from "@/domain/ai-context/application/providers/embedding-provider";
import { EmbeddingProviderError } from "@/domain/ai-context/application/providers/embedding-provider.error";
import type { Env } from "@/env/env";

// Conservative batch size — Ollama dispatches each input sequentially on the
// host GPU/CPU, so large payloads can exhaust VRAM on modest hardware. 64
// keeps memory pressure predictable while still amortizing HTTP overhead.
const OLLAMA_MAX_BATCH_SIZE = 64;

interface OllamaEmbedResponse {
    embeddings: number[][];
}

/**
 * Ollama embedding provider (self-hosted, local-first).
 *
 * Uses the modern plural `POST /api/embed` endpoint, which accepts an array
 * of inputs and returns embeddings in the same order. Ollama has no official
 * Node SDK, so we call the REST API directly with the native `fetch` client
 * (Node 22+).
 *
 * Notes:
 *  - No authentication: Ollama is typically reachable on `localhost:11434`
 *    or an internal VPS host. Users who expose it publicly should front it
 *    with their own reverse proxy / auth.
 *  - `options.inputType` ("document" | "query") is ignored: Ollama embedding
 *    models do not distinguish between indexing and query tasks, so both
 *    share the same embedding space for this provider.
 *  - `ECONNREFUSED` (daemon offline) is the most common failure — we
 *    decorate the error with the configured base URL to speed up debugging.
 */
export class OllamaEmbeddingProvider implements EmbeddingProvider {
    readonly name = "ollama" as const;
    readonly dimension: number;

    private readonly baseUrl: string;
    private readonly model: string;

    constructor(configService: ConfigService<Env, true>) {
        const baseUrl = configService.get("OLLAMA_BASE_URL", { infer: true });
        const model = configService.get("OLLAMA_EMBEDDING_MODEL", { infer: true });
        const dimension = configService.get("EMBEDDING_DIMENSION", { infer: true });

        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.model = model;
        this.dimension = dimension;
    }

    async embed(texts: string[], _options: EmbedOptions): Promise<number[][]> {
        if (texts.length === 0) {
            return [];
        }

        const results: number[][] = [];

        for (let start = 0; start < texts.length; start += OLLAMA_MAX_BATCH_SIZE) {
            const batch = texts.slice(start, start + OLLAMA_MAX_BATCH_SIZE);
            const batchResult = await this.embedBatch(batch);
            results.push(...batchResult);
        }

        return results;
    }

    private async embedBatch(input: string[]): Promise<number[][]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/embed`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: this.model, input }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
            }

            const json = (await response.json()) as OllamaEmbedResponse;

            if (!Array.isArray(json.embeddings)) {
                throw new Error("Unexpected response shape from Ollama /api/embed (missing `embeddings` array)");
            }

            return json.embeddings;
        } catch (error) {
            const cause = error instanceof Error ? error.message : String(error);
            const message =
                cause.includes("ECONNREFUSED") || cause.includes("fetch failed")
                    ? `${cause} (is Ollama running at ${this.baseUrl}?)`
                    : cause;
            throw new EmbeddingProviderError(this.name, message, error);
        }
    }
}
