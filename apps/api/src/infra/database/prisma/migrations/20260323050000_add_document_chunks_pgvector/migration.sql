CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "release_version_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "section_title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(512) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "document_chunks_document_id_idx" ON "document_chunks"("document_id");
CREATE INDEX "document_chunks_space_id_idx" ON "document_chunks"("space_id");
CREATE INDEX "document_chunks_release_version_id_idx" ON "document_chunks"("release_version_id");

ALTER TABLE "document_chunks"
ADD CONSTRAINT "document_chunks_document_id_fkey"
FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
