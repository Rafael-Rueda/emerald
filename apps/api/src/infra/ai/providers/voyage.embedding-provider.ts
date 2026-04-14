import type { ConfigService } from "@nestjs/config";
import { VoyageAIClient } from "voyageai";

import type {
    EmbeddingInputType,
    EmbeddingProvider,
    EmbedOptions,
} from "@/domain/ai-context/application/providers/embedding-provider";
import { EmbeddingProviderError } from "@/domain/ai-context/application/providers/embedding-provider.error";
import type { Env } from "@/env/env";

const mapInputType = (inputType: EmbeddingInputType): "document" | "query" => inputType;

export class VoyageEmbeddingProvider implements EmbeddingProvider {
    readonly name = "voyage" as const;
    readonly dimension: number;

    private readonly client: VoyageAIClient;
    private readonly model: string;

    constructor(configService: ConfigService<Env, true>) {
        const apiKey = configService.get("VOYAGE_API_KEY", { infer: true });
        const model = configService.get("VOYAGE_MODEL", { infer: true });
        const dimension = configService.get("EMBEDDING_DIMENSION", { infer: true });

        this.client = new VoyageAIClient({ apiKey });
        this.model = model ?? "voyage-3-lite";
        this.dimension = dimension ?? 512;
    }

    async embed(texts: string[], options: EmbedOptions): Promise<number[][]> {
        if (texts.length === 0) {
            return [];
        }

        try {
            const response = await this.client.embed({
                input: texts,
                model: this.model,
                inputType: mapInputType(options.inputType),
            });

            const data = response.data ?? [];
            return data.map((item) => item.embedding ?? []);
        } catch (error) {
            throw new EmbeddingProviderError(this.name, error instanceof Error ? error.message : String(error), error);
        }
    }
}
