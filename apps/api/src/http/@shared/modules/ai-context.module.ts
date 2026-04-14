import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaModule } from "./prisma.module";

import { AiContextService } from "@/domain/ai-context/application/ai-context.service";
import {
    EMBEDDING_PROVIDER,
    type EmbeddingProvider,
} from "@/domain/ai-context/application/providers/embedding-provider";
import { DOCUMENT_CHUNK_REPOSITORY } from "@/domain/ai-context/application/repositories/document-chunk.repository";
import type { Env } from "@/env/env";
import { GoogleVertexEmbeddingProvider } from "@/infra/ai/providers/google-vertex.embedding-provider";
import { OllamaEmbeddingProvider } from "@/infra/ai/providers/ollama.embedding-provider";
import { OpenAiEmbeddingProvider } from "@/infra/ai/providers/openai.embedding-provider";
import { VoyageEmbeddingProvider } from "@/infra/ai/providers/voyage.embedding-provider";
import { PrismaDocumentChunkRepository } from "@/infra/database/prisma/repositories/document-chunk.repository";

@Module({
    imports: [PrismaModule],
    providers: [
        {
            provide: DOCUMENT_CHUNK_REPOSITORY,
            useClass: PrismaDocumentChunkRepository,
        },
        {
            provide: EMBEDDING_PROVIDER,
            inject: [ConfigService],
            // Selects the embedding adapter based on EMBEDDING_PROVIDER env.
            useFactory: (configService: ConfigService<Env, true>): EmbeddingProvider => {
                const providerName = configService.get("EMBEDDING_PROVIDER", { infer: true });

                switch (providerName) {
                    case "voyage":
                        return new VoyageEmbeddingProvider(configService);
                    case "openai":
                        return new OpenAiEmbeddingProvider(configService);
                    case "google":
                        return new GoogleVertexEmbeddingProvider(configService);
                    case "ollama":
                        return new OllamaEmbeddingProvider(configService);
                }
            },
        },
        AiContextService,
    ],
    exports: [AiContextService, DOCUMENT_CHUNK_REPOSITORY, EMBEDDING_PROVIDER],
})
export class AiContextModule {}
