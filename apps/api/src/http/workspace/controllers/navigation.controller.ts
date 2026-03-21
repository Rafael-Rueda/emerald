import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";

import { Validator } from "@/http/@shared/decorators/validator.decorator";
import { Author } from "@/http/auth/decorators/author.decorator";
import { Roles } from "@/http/auth/decorators/roles.decorator";
import { Role } from "@/http/auth/enums/role.enum";
import {
    CreateNavigationNodeBodyDTO,
    createNavigationNodeBodySchema,
    GetNavigationTreeQueryDTO,
    getNavigationTreeQuerySchema,
    MoveNavigationNodeBodyDTO,
    moveNavigationNodeBodySchema,
    NavigationNodeResponseDTO,
    NavigationTreeResponseDTO,
    UpdateNavigationNodeBodyDTO,
    updateNavigationNodeBodySchema,
} from "@/http/workspace/schemas/navigation.schema";
import { NavigationService } from "@/http/workspace/services/navigation.service";

@ApiTags("Workspace Navigation")
@ApiBearerAuth("JWT-auth")
@Controller("/api/workspace/navigation")
export class NavigationController {
    constructor(private readonly navigationService: NavigationService) {}

    @Post()
    @Author()
    @Validator(createNavigationNodeBodySchema, 422)
    @ApiOperation({ summary: "Create navigation node" })
    @ApiBody({ type: CreateNavigationNodeBodyDTO })
    @ApiResponse({ status: 201, description: "Navigation node created", type: NavigationNodeResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    create(@Body() body: CreateNavigationNodeBodyDTO) {
        return this.navigationService.create(body);
    }

    @Get()
    @Roles(Role.VIEWER)
    @Validator(getNavigationTreeQuerySchema)
    @ApiOperation({ summary: "Get navigation tree" })
    @ApiQuery({ name: "spaceId", type: String, required: true })
    @ApiResponse({ status: 200, description: "Navigation tree", type: NavigationTreeResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    getTree(@Query() query: GetNavigationTreeQueryDTO) {
        return this.navigationService.getTree(query);
    }

    @Patch(":id")
    @Author()
    @Validator(updateNavigationNodeBodySchema, 422)
    @ApiOperation({ summary: "Update navigation node" })
    @ApiParam({ name: "id", type: String, description: "Navigation node UUID" })
    @ApiBody({ type: UpdateNavigationNodeBodyDTO })
    @ApiResponse({ status: 200, description: "Navigation node updated", type: NavigationNodeResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    @ApiResponse({ status: 404, description: "Navigation node not found" })
    update(@Param("id") id: string, @Body() body: UpdateNavigationNodeBodyDTO) {
        return this.navigationService.update(id, body);
    }

    @Post(":id/move")
    @HttpCode(200)
    @Author()
    @Validator(moveNavigationNodeBodySchema, 422)
    @ApiOperation({ summary: "Move navigation node" })
    @ApiParam({ name: "id", type: String, description: "Navigation node UUID" })
    @ApiBody({ type: MoveNavigationNodeBodyDTO })
    @ApiResponse({ status: 200, description: "Navigation node moved", type: NavigationNodeResponseDTO })
    @ApiResponse({ status: 400, description: "Circular reference error" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    @ApiResponse({ status: 404, description: "Navigation node not found" })
    move(@Param("id") id: string, @Body() body: MoveNavigationNodeBodyDTO) {
        return this.navigationService.move(id, body);
    }

    @Delete(":id")
    @Author()
    @ApiOperation({ summary: "Delete navigation node" })
    @ApiParam({ name: "id", type: String, description: "Navigation node UUID" })
    @ApiResponse({ status: 200, description: "Navigation node deleted", type: NavigationNodeResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    @ApiResponse({ status: 404, description: "Navigation node not found" })
    remove(@Param("id") id: string) {
        return this.navigationService.remove(id);
    }
}
