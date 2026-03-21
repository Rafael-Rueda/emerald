import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";

import { Validator } from "@/http/@shared/decorators/validator.decorator";
import { Author } from "@/http/auth/decorators/author.decorator";
import {
    CreateVersionBodyDTO,
    createVersionBodySchema,
    ListVersionsQueryDTO,
    listVersionsQuerySchema,
    VersionResponseDTO,
    VersionsListResponseDTO,
} from "@/http/workspace/schemas/versions.schema";
import { VersionsService } from "@/http/workspace/services/versions.service";

@ApiTags("Workspace Versions")
@ApiBearerAuth("JWT-auth")
@Controller("/api/workspace/versions")
export class VersionsController {
    constructor(private readonly versionsService: VersionsService) {}

    @Post()
    @Author()
    @Validator(createVersionBodySchema, 422)
    @ApiOperation({ summary: "Create release version" })
    @ApiBody({ type: CreateVersionBodyDTO })
    @ApiResponse({ status: 201, description: "Release version created", type: VersionResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    @ApiResponse({ status: 409, description: "Duplicate version key in same space" })
    create(@Body() body: CreateVersionBodyDTO) {
        return this.versionsService.create(body);
    }

    @Get()
    @Author()
    @Validator(listVersionsQuerySchema)
    @ApiOperation({ summary: "List release versions by space" })
    @ApiQuery({ name: "spaceId", type: String, required: true })
    @ApiResponse({ status: 200, description: "Release versions listed", type: VersionsListResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    findAll(@Query() query: ListVersionsQueryDTO) {
        return this.versionsService.findAll(query);
    }

    @Get(":id")
    @Author()
    @ApiOperation({ summary: "Get release version by id" })
    @ApiParam({ name: "id", type: String, description: "Release version UUID" })
    @ApiResponse({ status: 200, description: "Release version found", type: VersionResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    @ApiResponse({ status: 404, description: "Release version not found" })
    findOne(@Param("id") id: string) {
        return this.versionsService.findOne(id);
    }

    @Patch(":id")
    @Author()
    @ApiOperation({ summary: "Archive release version" })
    @ApiParam({ name: "id", type: String, description: "Release version UUID" })
    @ApiResponse({ status: 200, description: "Release version archived", type: VersionResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    @ApiResponse({ status: 404, description: "Release version not found" })
    archive(@Param("id") id: string) {
        return this.versionsService.archive(id);
    }

    @Post(":id/publish")
    @HttpCode(200)
    @Author()
    @ApiOperation({ summary: "Publish release version" })
    @ApiParam({ name: "id", type: String, description: "Release version UUID" })
    @ApiResponse({ status: 200, description: "Release version published", type: VersionResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    @ApiResponse({ status: 404, description: "Release version not found" })
    publish(@Param("id") id: string) {
        return this.versionsService.publish(id);
    }

    @Post(":id/set-default")
    @HttpCode(200)
    @Author()
    @ApiOperation({ summary: "Set release version as default (atomic per space)" })
    @ApiParam({ name: "id", type: String, description: "Release version UUID" })
    @ApiResponse({ status: 200, description: "Default version updated", type: VersionResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    @ApiResponse({ status: 404, description: "Release version not found" })
    setDefault(@Param("id") id: string) {
        return this.versionsService.setDefault(id);
    }
}
