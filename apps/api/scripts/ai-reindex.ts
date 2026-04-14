#!/usr/bin/env node
/**
 * ============================================================================
 * ai-reindex — Regenerate embeddings for all published documents
 * ============================================================================
 *
 * Boots a standalone Nest application context (no HTTP), iterates over every
 * document with a current (published) revision, and calls
 * AiContextService.generateAndStoreEmbeddings(documentId) for each one.
 *
 * Use after:
 *   - Switching EMBEDDING_PROVIDER
 *   - Running `pnpm --filter @emerald/api ai:dimension:apply`
 *   - Bulk content restore
 *
 * Usage:
 *   pnpm --filter @emerald/api ai:reindex
 *
 * Exit codes:
 *   0 — all documents reindexed successfully
 *   1 — one or more documents failed (details logged per-document)
 *
 * ============================================================================
 */
import "dotenv/config";

import { NestFactory } from "@nestjs/core";

import { AiContextService } from "@/domain/ai-context/application/ai-context.service";
import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { AppModule } from "@/http/app.module";

async function main(): Promise<void> {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ["log", "error", "warn"],
    });

    const aiContext = app.get(AiContextService);
    const prisma = app.get(PrismaService);

    try {
        const documents = await prisma.document.findMany({
            where: { currentRevisionId: { not: null } },
            select: { id: true, title: true },
        });

        console.log(`[reindex] Found ${documents.length} documents with published revisions.`);

        let ok = 0;
        let fail = 0;

        for (const doc of documents) {
            try {
                await aiContext.generateAndStoreEmbeddings(doc.id);
                ok += 1;
                console.log(`[reindex] OK  ${doc.id} (${doc.title})`);
            } catch (error) {
                fail += 1;
                console.error(
                    `[reindex] ERR ${doc.id} (${doc.title}):`,
                    error instanceof Error ? error.message : error,
                );
            }
        }

        console.log(`[reindex] Done. OK=${ok}, FAIL=${fail}, TOTAL=${documents.length}`);

        if (fail > 0) {
            process.exitCode = 1;
        }
    } finally {
        await app.close();
    }
}

main().catch((error) => {
    console.error("[reindex] FAILED:", error instanceof Error ? error.message : error);
    process.exit(1);
});
