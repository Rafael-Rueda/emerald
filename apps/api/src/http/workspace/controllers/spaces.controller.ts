import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";

import { Validator } from "@/http/@shared/decorators/validator.decorator";
import { Roles } from "@/http/auth/decorators/roles.decorator";
import { SuperAdmin } from "@/http/auth/decorators/super-admin.decorator";
import { Role } from "@/http/auth/enums/role.enum";
import {
    CreateSpaceBodyDTO,
    createSpaceBodySchema,
    SpaceResponseDTO,
    SpacesListResponseDTO,
    UpdateSpaceBodyDTO,
    updateSpaceBodySchema,
} from "@/http/workspace/schemas/spaces.schema";
import { SpacesService } from "@/http/workspace/services/spaces.service";

@ApiTags("Workspace Spaces")
@ApiBearerAuth("JWT-auth")
@Controller("/api/workspace/spaces")
export class SpacesController {
    constructor(private readonly spacesService: SpacesService) {}

    @Post()
    @SuperAdmin()
    @Validator(createSpaceBodySchema)
    @ApiOperation({ summary: "Create a workspace space" })
    @ApiBody({ type: CreateSpaceBodyDTO })
    @ApiResponse({ status: 201, description: "Space created", type: SpaceResponseDTO })
    @ApiResponse({ status: 400, description: "Validation error" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    @ApiResponse({ status: 409, description: "Space key already exists" })
    create(@Body() body: CreateSpaceBodyDTO) {
        return this.spacesService.create(body);
    }

    @Get()
    @Roles(Role.VIEWER)
    @ApiOperation({ summary: "List workspace spaces" })
    @ApiResponse({ status: 200, description: "Spaces listed", type: SpacesListResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    findAll(): Promise<SpacesListResponseDTO> {
        return this.spacesService.findAll() as Promise<SpacesListResponseDTO>;
    }

    @Get(":id")
    @Roles(Role.VIEWER)
    @ApiOperation({ summary: "Get workspace space by id" })
    @ApiParam({ name: "id", type: String, description: "Space UUID" })
    @ApiResponse({ status: 200, description: "Space found", type: SpaceResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 404, description: "Space not found" })
    findOne(@Param("id") id: string) {
        return this.spacesService.findOne(id);
    }

    @Patch(":id")
    @SuperAdmin()
    @Validator(updateSpaceBodySchema)
    @ApiOperation({ summary: "Update a workspace space" })
    @ApiParam({ name: "id", type: String, description: "Space UUID" })
    @ApiBody({ type: UpdateSpaceBodyDTO })
    @ApiResponse({ status: 200, description: "Space updated", type: SpaceResponseDTO })
    @ApiResponse({ status: 400, description: "Validation error" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    @ApiResponse({ status: 404, description: "Space not found" })
    @ApiResponse({ status: 409, description: "Space key already exists" })
    update(@Param("id") id: string, @Body() body: UpdateSpaceBodyDTO) {
        return this.spacesService.update(id, body);
    }

    @Delete(":id")
    @SuperAdmin()
    @ApiOperation({ summary: "Delete a workspace space" })
    @ApiParam({ name: "id", type: String, description: "Space UUID" })
    @ApiResponse({ status: 200, description: "Space deleted", type: SpaceResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 403, description: "Forbidden" })
    @ApiResponse({ status: 404, description: "Space not found" })
    remove(@Param("id") id: string) {
        return this.spacesService.remove(id);
    }
}
