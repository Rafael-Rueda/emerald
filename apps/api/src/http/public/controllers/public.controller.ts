import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";

import { Validator } from "@/http/@shared/decorators/validator.decorator";
import { Public } from "@/http/auth/decorators/public.decorator";
import {
    PublicDocumentResponseDTO,
    PublicNavigationResponseDTO,
    PublicSearchQueryDTO,
    PublicSearchResponseDTO,
    PublicVersionsResponseDTO,
    publicSearchQuerySchema,
} from "@/http/public/schemas/public.schema";
import { PublicService } from "@/http/public/services/public.service";

@ApiTags("Public Content")
@Public()
@Controller("/api/public")
export class PublicController {
    constructor(private readonly publicService: PublicService) {}

    @Get("spaces/:spaceKey/versions")
    @ApiOperation({ summary: "List published versions for a public space" })
    @ApiParam({ name: "spaceKey", type: String, description: "Space key" })
    @ApiResponse({ status: 200, description: "Published versions", type: PublicVersionsResponseDTO })
    findVersions(@Param("spaceKey") spaceKey: string) {
        return this.publicService.findVersions(spaceKey);
    }

    @Get("spaces/:spaceKey/versions/:versionKey/navigation")
    @ApiOperation({ summary: "Get public navigation tree by space/version" })
    @ApiParam({ name: "spaceKey", type: String, description: "Space key" })
    @ApiParam({ name: "versionKey", type: String, description: "Version key" })
    @ApiResponse({ status: 200, description: "Navigation tree", type: PublicNavigationResponseDTO })
    @ApiResponse({ status: 404, description: "Navigation not found" })
    findNavigation(@Param("spaceKey") spaceKey: string, @Param("versionKey") versionKey: string) {
        return this.publicService.findNavigation(spaceKey, versionKey);
    }

    @Get("spaces/:spaceKey/versions/:versionKey/documents/:slug")
    @ApiOperation({ summary: "Get public document by space/version/slug" })
    @ApiParam({ name: "spaceKey", type: String, description: "Space key" })
    @ApiParam({ name: "versionKey", type: String, description: "Version key" })
    @ApiParam({ name: "slug", type: String, description: "Document slug" })
    @ApiResponse({ status: 200, description: "Document response", type: PublicDocumentResponseDTO })
    @ApiResponse({ status: 404, description: "Document not found" })
    findDocument(@Param("spaceKey") spaceKey: string, @Param("versionKey") versionKey: string, @Param("slug") slug: string) {
        return this.publicService.findDocument(spaceKey, versionKey, slug);
    }

    @Get("search")
    @Validator(publicSearchQuerySchema)
    @ApiOperation({ summary: "Search across published public documents" })
    @ApiQuery({ name: "q", type: String, required: false, description: "Search query" })
    @ApiResponse({ status: 200, description: "Search response", type: PublicSearchResponseDTO })
    search(@Query() query: PublicSearchQueryDTO) {
        return this.publicService.search(query.q);
    }
}
