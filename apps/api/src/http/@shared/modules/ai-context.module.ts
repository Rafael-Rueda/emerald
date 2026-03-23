import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { VoyageAIClient } from "voyageai";

import { PrismaModule } from "./prisma.module";

import {
    AiContextService,
    VOYAGE_AI_EMBEDDING_CLIENT,
    type VoyageAiEmbeddingClient,
} from "@/domain/ai-context/application/ai-context.service";
import { DOCUMENT_CHUNK_REPOSITORY } from "@/domain/ai-context/application/repositories/document-chunk.repository";
import type { Env } from "@/env/env";
import { PrismaDocumentChunkRepository } from "@/infra/database/prisma/repositories/document-chunk.repository";

@Module({
    imports: [PrismaModule],
    providers: [
        {
            provide: DOCUMENT_CHUNK_REPOSITORY,
            useClass: PrismaDocumentChunkRepository,
        },
        {
            provide: VOYAGE_AI_EMBEDDING_CLIENT,
            inject: [ConfigService],
            useFactory: (configService: ConfigService<Env, true>): VoyageAiEmbeddingClient => {
                const apiKey = configService.get("VOYAGE_API_KEY", { infer: true });
                const client = new VoyageAIClient({ apiKey });

                return {
                    embed: async ({ input, model, input_type }) =>
                        client.embed({
                            input,
                            model,
                            inputType: input_type,
                        }),
                };
            },
        },
        AiContextService,
    ],
    exports: [AiContextService, DOCUMENT_CHUNK_REPOSITORY, VOYAGE_AI_EMBEDDING_CLIENT],
})
export class AiContextModule {}
