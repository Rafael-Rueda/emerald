import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { Validator } from "@/http/@shared/decorators/validator.decorator";
import { Author } from "@/http/auth/decorators/author.decorator";
import { Roles } from "@/http/auth/decorators/roles.decorator";
import { Role } from "@/http/auth/enums/role.enum";
import {
    CreateDocumentBodyDTO,
    createDocumentBodySchema,
    ListDocumentsQueryDTO,
    listDocumentsQuerySchema,
    UpdateDocumentBodyDTO,
    updateDocumentBodySchema,
    WorkspaceDocumentResponseDTO,
    WorkspaceDocumentsListResponseDTO,
} from "@/http/workspace/schemas/documents.schema";
import { DocumentsService } from "@/http/workspace/services/documents.service";

type AuthenticatedRequest = Request & {
    user: {
        id: string;
    };
};

@ApiTags("Workspace Documents")
@ApiBearerAuth("JWT-auth")
@Controller("/api/workspace/documents")
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) {}

    @Post()
    @Author()
    @Validator(createDocumentBodySchema, 422)
    @ApiOperation({ summary: "Create workspace document" })
    @ApiBody({ type: CreateDocumentBodyDTO })
    @ApiResponse({ status: 201, description: "Document created", type: WorkspaceDocumentResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    @ApiResponse({ status: 409, description: "Duplicate slug for same space + version" })
    create(@Body() body: CreateDocumentBodyDTO, @Req() request: AuthenticatedRequest) {
        return this.documentsService.create(body, request.user.id);
    }

    @Get()
    @Roles(Role.VIEWER)
    @Validator(listDocumentsQuerySchema)
    @ApiOperation({ summary: "List workspace documents by space" })
    @ApiQuery({ name: "spaceId", type: String, required: true })
    @ApiQuery({ name: "page", type: Number, required: false })
    @ApiQuery({ name: "limit", type: Number, required: false })
    @ApiResponse({ status: 200, description: "Documents listed", type: WorkspaceDocumentsListResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    findAll(@Query() query: ListDocumentsQueryDTO) {
        return this.documentsService.findAll(query);
    }

    @Get(":id")
    @Roles(Role.VIEWER)
    @ApiOperation({ summary: "Get workspace document by id" })
    @ApiParam({ name: "id", type: String, description: "Document UUID" })
    @ApiResponse({ status: 200, description: "Document found", type: WorkspaceDocumentResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 404, description: "Document not found" })
    findOne(@Param("id") id: string) {
        return this.documentsService.findOne(id);
    }

    @Patch(":id")
    @Author()
    @Validator(updateDocumentBodySchema, 422)
    @ApiOperation({ summary: "Update workspace document" })
    @ApiParam({ name: "id", type: String, description: "Document UUID" })
    @ApiBody({ type: UpdateDocumentBodyDTO })
    @ApiResponse({ status: 200, description: "Document updated", type: WorkspaceDocumentResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    @ApiResponse({ status: 404, description: "Document not found" })
    update(@Param("id") id: string, @Body() body: UpdateDocumentBodyDTO, @Req() request: AuthenticatedRequest) {
        return this.documentsService.update(id, body, request.user.id);
    }

    @Post(":id/publish")
    @HttpCode(200)
    @Author()
    @ApiOperation({ summary: "Publish workspace document (idempotent)" })
    @ApiParam({ name: "id", type: String, description: "Document UUID" })
    @ApiResponse({ status: 200, description: "Document published", type: WorkspaceDocumentResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    @ApiResponse({ status: 404, description: "Document not found" })
    publish(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
        return this.documentsService.publish(id, request.user.id);
    }
}
