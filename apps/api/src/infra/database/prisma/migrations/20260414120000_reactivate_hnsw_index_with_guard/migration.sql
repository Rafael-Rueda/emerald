-- Reactivates HNSW index on document_chunks.embedding (was dropped in 20260323164958_ai_context_and_mcp).
-- Uses IF NOT EXISTS to be re-run safe and to coexist with the ai:dimension:apply tool
-- that re-creates the index after an ALTER COLUMN ... TYPE vector(N) change.

CREATE INDEX IF NOT EXISTS "document_chunks_embedding_hnsw_idx"
  ON "document_chunks"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
