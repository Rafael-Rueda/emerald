import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";

import { AiContextService } from "@/domain/ai-context/application/ai-context.service";
import { Author } from "@/http/auth/decorators/author.decorator";

@ApiTags("Workspace AI Context")
@ApiBearerAuth("JWT-auth")
@Controller("/api/workspace/ai-context")
export class WorkspaceAiContextController {
    constructor(private readonly aiContextService: AiContextService) {}

    @Get("stats")
    @Author()
    @ApiOperation({ summary: "Get embedding stats for all documents in a space" })
    @ApiQuery({ name: "spaceId", type: String, required: true })
    @ApiResponse({ status: 200, description: "Chunk stats by document" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    getStats(@Query("spaceId") spaceId: string) {
        return this.aiContextService.getChunkStatsBySpaceId(spaceId);
    }

    @Post("regenerate/:documentId")
    @Author()
    @ApiOperation({ summary: "Regenerate embeddings for a document" })
    @ApiParam({ name: "documentId", type: String, description: "Document UUID" })
    @ApiResponse({ status: 200, description: "Embeddings regenerated" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async regenerateEmbeddings(@Param("documentId") documentId: string) {
        await this.aiContextService.generateAndStoreEmbeddings(documentId);
        return { success: true, documentId };
    }

    @Get(":entityType/:entityId")
    @Author()
    @ApiOperation({ summary: "Get AI context chunks for a workspace entity" })
    @ApiParam({ name: "entityType", type: String, description: "Entity type (e.g. document)" })
    @ApiParam({ name: "entityId", type: String, description: "Entity UUID" })
    @ApiResponse({ status: 200, description: "AI context response" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    getEntityContext(
        @Param("entityType") entityType: string,
        @Param("entityId") entityId: string,
    ) {
        if (entityType === "document") {
            return this.aiContextService.getDocumentContext(entityId);
        }

        return {
            entityId,
            entityType,
            chunks: [],
        };
    }
}
