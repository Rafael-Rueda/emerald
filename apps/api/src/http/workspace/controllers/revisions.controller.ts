import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { Validator } from "@/http/@shared/decorators/validator.decorator";
import { Author } from "@/http/auth/decorators/author.decorator";
import { Roles } from "@/http/auth/decorators/roles.decorator";
import { Role } from "@/http/auth/enums/role.enum";
import {
    CreateRevisionBodyDTO,
    createRevisionBodySchema,
    DocumentRevisionResponseDTO,
    DocumentRevisionsListResponseDTO,
} from "@/http/workspace/schemas/revisions.schema";
import { DocumentsService } from "@/http/workspace/services/documents.service";

type AuthenticatedRequest = Request & {
    user: {
        id: string;
    };
};

@ApiTags("Workspace Document Revisions")
@ApiBearerAuth("JWT-auth")
@Controller("/api/workspace/documents/:id/revisions")
export class RevisionsController {
    constructor(private readonly documentsService: DocumentsService) {}

    @Post()
    @Author()
    @Validator(createRevisionBodySchema, 422)
    @ApiOperation({ summary: "Create document revision" })
    @ApiParam({ name: "id", type: String, description: "Document UUID" })
    @ApiBody({ type: CreateRevisionBodyDTO })
    @ApiResponse({ status: 201, description: "Revision created", type: DocumentRevisionResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    @ApiResponse({ status: 404, description: "Document not found" })
    create(@Param("id") id: string, @Body() body: CreateRevisionBodyDTO, @Req() request: AuthenticatedRequest) {
        return this.documentsService.createRevision(id, body, request.user.id);
    }

    @Get()
    @Roles(Role.VIEWER)
    @ApiOperation({ summary: "List document revisions" })
    @ApiParam({ name: "id", type: String, description: "Document UUID" })
    @ApiResponse({ status: 200, description: "Revisions listed", type: DocumentRevisionsListResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 404, description: "Document not found" })
    findAll(@Param("id") id: string) {
        return this.documentsService.getRevisions(id);
    }
}
