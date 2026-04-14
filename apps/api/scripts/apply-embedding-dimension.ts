#!/usr/bin/env node
/**
 * ============================================================================
 * apply-embedding-dimension — DESTRUCTIVE TOOLING
 * ============================================================================
 *
 * This script applies a change in EMBEDDING_DIMENSION (from .env) to the
 * existing Postgres database. It is a MANUAL, OPT-IN command.
 *
 * What it does (in order):
 *   1. Reads the desired dimension from process.env.EMBEDDING_DIMENSION.
 *   2. Inspects the live dimension of document_chunks.embedding via pg_attribute.
 *   3. If they already match — no-ops.
 *   4. Otherwise:
 *        - Drops the HNSW index (document_chunks_embedding_hnsw_idx).
 *        - TRUNCATES the document_chunks table (ALL EMBEDDINGS WILL BE LOST).
 *        - Runs ALTER TABLE ... ALTER COLUMN embedding TYPE vector(<N>).
 *        - Re-creates the HNSW index with the same options used in the
 *          original migration (m = 16, ef_construction = 64).
 *
 * IMPORTANT:
 *   - This script DOES NOT modify schema.prisma. The Prisma schema still
 *     declares vector(512); the source of truth for the runtime dimension is
 *     EMBEDDING_DIMENSION in env + the actual column type in the live DB.
 *   - After running this, run `pnpm --filter @emerald/api ai:reindex` to
 *     regenerate all embeddings with the new provider/dimension.
 *   - You must run this BEFORE starting the API with a new provider, or the
 *     runtime dimension check will warn about a mismatch.
 *
 * Usage:
 *   pnpm --filter @emerald/api ai:dimension:apply
 *
 * ============================================================================
 */
import "dotenv/config";

import { PrismaClient } from "@prisma/client";

async function main(): Promise<void> {
    const rawDim = process.env.EMBEDDING_DIMENSION ?? "512";
    const targetDim = Number(rawDim);

    if (!Number.isInteger(targetDim) || targetDim < 1) {
        console.error(`[dimension:apply] EMBEDDING_DIMENSION must be a positive integer (got "${rawDim}")`);
        process.exit(1);
    }

    const prisma = new PrismaClient();

    try {
        const rows = await prisma.$queryRawUnsafe<Array<{ atttypmod: number }>>(
            `SELECT atttypmod FROM pg_attribute
             JOIN pg_class ON pg_class.oid = attrelid
             WHERE relname = 'document_chunks' AND attname = 'embedding'`,
        );

        if (rows.length === 0) {
            throw new Error("document_chunks.embedding column not found. Has the migration been applied?");
        }

        // pgvector stores the vector dimension directly in atttypmod.
        const currentDim = Number(rows[0].atttypmod);

        console.log(`[dimension:apply] Current: vector(${currentDim}), Target: vector(${targetDim})`);

        if (currentDim === targetDim) {
            console.log("[dimension:apply] Already at target dimension. Nothing to do.");
            return;
        }

        console.log("[dimension:apply] Dropping HNSW index...");
        await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "document_chunks_embedding_hnsw_idx"`);

        console.log("[dimension:apply] Truncating document_chunks (reindex required)...");
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "document_chunks"`);

        console.log(`[dimension:apply] ALTER COLUMN embedding TYPE vector(${targetDim})...`);
        await prisma.$executeRawUnsafe(
            `ALTER TABLE "document_chunks" ALTER COLUMN "embedding" TYPE vector(${targetDim})`,
        );

        console.log("[dimension:apply] Recreating HNSW index...");
        await prisma.$executeRawUnsafe(
            `CREATE INDEX "document_chunks_embedding_hnsw_idx" ON "document_chunks"
             USING hnsw ("embedding" vector_cosine_ops)
             WITH (m = 16, ef_construction = 64)`,
        );

        console.log(
            "[dimension:apply] Done. Run `pnpm --filter @emerald/api ai:reindex` to regenerate embeddings.",
        );
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error("[dimension:apply] FAILED:", error instanceof Error ? error.message : error);
    process.exit(1);
});
