import type { ConfigService } from "@nestjs/config";
import { GoogleAuth } from "google-auth-library";

import type {
    EmbeddingInputType,
    EmbeddingProvider,
    EmbedOptions,
} from "@/domain/ai-context/application/providers/embedding-provider";
import { EmbeddingProviderError } from "@/domain/ai-context/application/providers/embedding-provider.error";
import type { Env } from "@/env/env";

// Vertex `predict` accepts at most 250 instances per request for embedding models,
// but the documented "safe" batch size is 100. Keeping the conservative limit
// aligns with Google's own examples and keeps payloads small on flaky networks.
const VERTEX_MAX_BATCH_SIZE = 100;

const VERTEX_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

type VertexTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

const mapTaskType = (inputType: EmbeddingInputType): VertexTaskType =>
    inputType === "document" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY";

interface VertexPredictResponse {
    predictions: Array<{
        embeddings: {
            values: number[];
        };
    }>;
}

/**
 * Google Vertex AI embedding provider.
 *
 * Calls the Vertex `:predict` REST endpoint directly using `google-auth-library`
 * for bearer-token acquisition. This avoids pulling in the full
 * `@google-cloud/aiplatform` SDK (which is several hundred MB of transitive deps).
 *
 * Authentication follows the standard `GOOGLE_APPLICATION_CREDENTIALS` convention:
 * the env var holds the path to a service account JSON key file (e.g.
 * `/run/secrets/gcp-key.json`). Tokens are cached and refreshed automatically by
 * `GoogleAuth`.
 *
 * Note: Vertex embedding models return predictions in the same order as the
 * input `instances` array, so no defensive re-ordering is needed (unlike OpenAI).
 */
export class GoogleVertexEmbeddingProvider implements EmbeddingProvider {
    readonly name = "google" as const;
    readonly dimension: number;

    private readonly auth: GoogleAuth;
    private readonly endpoint: string;
    private readonly model: string;

    constructor(configService: ConfigService<Env, true>) {
        const projectId = configService.get("GOOGLE_PROJECT_ID", { infer: true });
        const keyFile = configService.get("GOOGLE_APPLICATION_CREDENTIALS", { infer: true });
        const location = configService.get("GOOGLE_VERTEX_LOCATION", { infer: true });
        const model = configService.get("GOOGLE_EMBEDDING_MODEL", { infer: true });
        const dimension = configService.get("EMBEDDING_DIMENSION", { infer: true });

        if (!projectId) {
            throw new EmbeddingProviderError("google", "GOOGLE_PROJECT_ID is required when EMBEDDING_PROVIDER=google");
        }
        if (!keyFile) {
            throw new EmbeddingProviderError(
                "google",
                "GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON) is required when EMBEDDING_PROVIDER=google",
            );
        }

        this.model = model;
        this.dimension = dimension;

        this.auth = new GoogleAuth({
            keyFile,
            scopes: [VERTEX_SCOPE],
        });

        this.endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${this.model}:predict`;
    }

    async embed(texts: string[], options: EmbedOptions): Promise<number[][]> {
        if (texts.length === 0) {
            return [];
        }

        const taskType = mapTaskType(options.inputType);
        const results: number[][] = [];

        for (let start = 0; start < texts.length; start += VERTEX_MAX_BATCH_SIZE) {
            const batch = texts.slice(start, start + VERTEX_MAX_BATCH_SIZE);
            const batchEmbeddings = await this.embedBatch(batch, taskType);
            results.push(...batchEmbeddings);
        }

        return results;
    }

    private async embedBatch(texts: string[], taskType: VertexTaskType): Promise<number[][]> {
        try {
            const client = await this.auth.getClient();
            const tokenResponse = await client.getAccessToken();
            const token = tokenResponse.token;

            if (!token) {
                throw new Error("Failed to acquire Google access token");
            }

            // Vertex predict API uses snake_case for instance fields
            // (task_type) and camelCase for parameters (outputDimensionality).
            const body = {
                instances: texts.map((content) => ({
                    task_type: taskType,
                    content,
                })),
                parameters: {
                    outputDimensionality: this.dimension,
                },
            };

            const response = await fetch(this.endpoint, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
            }

            const json = (await response.json()) as VertexPredictResponse;

            if (!Array.isArray(json.predictions)) {
                throw new Error("Vertex response missing `predictions` array");
            }

            return json.predictions.map((prediction) => prediction.embeddings.values);
        } catch (error) {
            throw new EmbeddingProviderError(this.name, error instanceof Error ? error.message : String(error), error);
        }
    }
}
