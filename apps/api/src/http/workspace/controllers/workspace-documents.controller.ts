import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { Author } from "@/http/auth/decorators/author.decorator";
import { Roles } from "@/http/auth/decorators/roles.decorator";
import { Role } from "@/http/auth/enums/role.enum";

@ApiTags("Workspace Documents")
@ApiBearerAuth("JWT-auth")
@Controller("/api/workspace/documents")
export class WorkspaceDocumentsController {
    @Get()
    @Roles(Role.VIEWER)
    @ApiOperation({ summary: "List workspace documents" })
    @ApiResponse({ status: 200, description: "Workspace documents listed" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    findAll() {
        return {
            documents: [],
            total: 0,
        };
    }

    @Post()
    @Author()
    @ApiOperation({ summary: "Create workspace document" })
    @ApiResponse({ status: 201, description: "Workspace document created" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    create(@Body() body: { title?: string; slug?: string }) {
        return {
            id: "workspace-document-placeholder",
            title: body.title ?? "Untitled",
            slug: body.slug ?? "untitled",
            status: "draft",
        };
    }
}
