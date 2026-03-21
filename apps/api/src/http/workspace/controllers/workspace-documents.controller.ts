import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { Author } from "@/http/auth/decorators/author.decorator";
import { Roles } from "@/http/auth/decorators/roles.decorator";
import { Role } from "@/http/auth/enums/role.enum";
import { Validator } from "@/http/@shared/decorators/validator.decorator";
import {
    createWorkspaceDocumentBodySchema,
    CreateWorkspaceDocumentBodyDTO,
    WorkspaceDocumentResponseDTO,
    WorkspaceDocumentsListResponseDTO,
} from "@/http/workspace/schemas/workspace-documents.schema";

@ApiTags("Workspace Documents")
@ApiBearerAuth("JWT-auth")
@Controller("/api/workspace/documents")
export class WorkspaceDocumentsController {
    @Get()
    @Roles(Role.VIEWER)
    @ApiOperation({ summary: "List workspace documents" })
    @ApiResponse({ status: 200, description: "Workspace documents listed", type: WorkspaceDocumentsListResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    findAll(): WorkspaceDocumentsListResponseDTO {
        return {
            documents: [],
            total: 0,
        };
    }

    @Post()
    @Author()
    @Validator(createWorkspaceDocumentBodySchema)
    @ApiOperation({ summary: "Create workspace document" })
    @ApiBody({ type: CreateWorkspaceDocumentBodyDTO })
    @ApiResponse({ status: 201, description: "Workspace document created", type: WorkspaceDocumentResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    create(@Body() body: CreateWorkspaceDocumentBodyDTO): WorkspaceDocumentResponseDTO {
        return {
            id: "workspace-document-placeholder",
            title: body.title ?? "Untitled",
            slug: body.slug ?? "untitled",
            status: "draft",
        };
    }
}
