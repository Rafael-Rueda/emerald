import { AiContextResponseSchema, type SemanticSearchQuery, SemanticSearchQuerySchema } from "@emerald/contracts";
import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";

import { AiContextService } from "@/domain/ai-context/application/ai-context.service";
import { Validator } from "@/http/@shared/decorators/validator.decorator";
import { Public } from "@/http/auth/decorators/public.decorator";

class SemanticSearchQueryDTO extends createZodDto(SemanticSearchQuerySchema) {}
class AiContextResponseDTO extends createZodDto(AiContextResponseSchema) {}

@ApiTags("Public AI Context")
@Public()
@Controller("/api/public/ai-context")
export class AiContextController {
    constructor(private readonly aiContextService: AiContextService) {}

    @Post("search")
    @HttpCode(200)
    @Validator(SemanticSearchQuerySchema)
    @ApiOperation({ summary: "Semantic search across indexed documentation chunks" })
    @ApiBody({ type: SemanticSearchQueryDTO })
    @ApiResponse({
        status: 200,
        description: "Semantic search response",
        type: AiContextResponseDTO,
    })
    search(@Body() body: SemanticSearchQuery) {
        return this.aiContextService.semanticSearch(body.query, body.space, body.version);
    }
}
