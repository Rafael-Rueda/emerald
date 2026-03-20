/*
  Warnings:

  - You are about to drop the `file_versions` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReleaseVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NavigationNodeType" AS ENUM ('DOCUMENT', 'GROUP', 'EXTERNAL_LINK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ROLES" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "ROLES" ADD VALUE 'AUTHOR';
ALTER TYPE "ROLES" ADD VALUE 'VIEWER';

-- DropForeignKey
ALTER TABLE "file_versions" DROP CONSTRAINT "file_versions_file_id_fkey";

-- DropTable
DROP TABLE "file_versions";

-- CreateTable
CREATE TABLE "spaces" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "release_version_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL,
    "current_revision_id" TEXT,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_revisions" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "content_json" JSONB NOT NULL,
    "rendered_html" TEXT,
    "plain_text" TEXT,
    "change_note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigation_nodes" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "release_version_id" TEXT,
    "parent_id" TEXT,
    "document_id" TEXT,
    "label" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "node_type" "NavigationNodeType" NOT NULL,
    "external_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "navigation_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_versions" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "ReleaseVersionStatus" NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "release_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "spaces_key_key" ON "spaces"("key");

-- CreateIndex
CREATE INDEX "documents_space_id_release_version_id_status_idx" ON "documents"("space_id", "release_version_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "documents_space_id_slug_release_version_id_key" ON "documents"("space_id", "slug", "release_version_id");

-- CreateIndex
CREATE INDEX "document_revisions_document_id_idx" ON "document_revisions"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_revisions_document_id_revision_number_key" ON "document_revisions"("document_id", "revision_number");

-- CreateIndex
CREATE INDEX "navigation_nodes_space_id_release_version_id_idx" ON "navigation_nodes"("space_id", "release_version_id");

-- CreateIndex
CREATE INDEX "navigation_nodes_parent_id_idx" ON "navigation_nodes"("parent_id");

-- CreateIndex
CREATE INDEX "release_versions_space_id_is_default_idx" ON "release_versions"("space_id", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "release_versions_space_id_key_key" ON "release_versions"("space_id", "key");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_release_version_id_fkey" FOREIGN KEY ("release_version_id") REFERENCES "release_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_current_revision_id_fkey" FOREIGN KEY ("current_revision_id") REFERENCES "document_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_nodes" ADD CONSTRAINT "navigation_nodes_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_nodes" ADD CONSTRAINT "navigation_nodes_release_version_id_fkey" FOREIGN KEY ("release_version_id") REFERENCES "release_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_nodes" ADD CONSTRAINT "navigation_nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "navigation_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_nodes" ADD CONSTRAINT "navigation_nodes_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_versions" ADD CONSTRAINT "release_versions_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
