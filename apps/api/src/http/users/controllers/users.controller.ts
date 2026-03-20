import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";

import {
    createUserBodySchema,
    CreateUserDTO,
    ListUsersQueryDTO,
    listUsersQuerySchema,
    updateUserBodySchema,
    UpdateUserDTO,
    UserResponseDTO,
} from "../schemas/users.schema";
import { UsersService } from "../services/users.service";

import type { Env } from "@/env/env";
import { Validator } from "@/http/@shared/decorators/validator.decorator";
import { Public } from "@/http/auth/decorators/public.decorator";

@ApiTags("Users")
@ApiBearerAuth("JWT-auth")
@Controller("/users")
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly configService: ConfigService<Env, true>,
    ) {}

    @Public()
    @Post()
    @Validator(createUserBodySchema)
    @ApiOperation({ summary: "Create user", description: "Create a new user account" })
    @ApiBody({ type: CreateUserDTO })
    @ApiResponse({ status: 201, description: "User created successfully", type: UserResponseDTO })
    @ApiResponse({ status: 400, description: "Validation error" })
    @ApiResponse({ status: 409, description: "User already exists" })
    create(@Body() body: CreateUserDTO) {
        return this.usersService.create(body);
    }

    @Get()
    @Validator(listUsersQuerySchema)
    @ApiOperation({ summary: "List users", description: "Get paginated list of all users" })
    @ApiQuery({ name: "page", required: false, type: Number, description: "Page number (default: 1)" })
    @ApiQuery({ name: "limit", required: false, type: Number, description: "Items per page (default: 10, max: 100)" })
    @ApiResponse({ status: 200, description: "Users list", type: [UserResponseDTO] })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    findAll(@Query() query: ListUsersQueryDTO) {
        return this.usersService.findAll(query);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get user by ID", description: "Get a specific user by their ID" })
    @ApiParam({ name: "id", type: String, description: "User UUID" })
    @ApiResponse({ status: 200, description: "User found", type: UserResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 404, description: "User not found" })
    findOne(@Param("id") id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(":id")
    @UseInterceptors(FileInterceptor("avatar"))
    @Validator(updateUserBodySchema)
    @ApiOperation({
        summary: "Update user",
        description: "Update user information. Upload avatar file or send deleteAvatar=true to remove it.",
    })
    @ApiConsumes("multipart/form-data")
    @ApiParam({ name: "id", type: String, description: "User UUID" })
    @ApiBody({
        description: "User update data with optional avatar",
        schema: {
            type: "object",
            properties: {
                username: { type: "string", description: "Username (3-24 characters)" },
                email: { type: "string", format: "email", description: "User email address" },
                password: { type: "string", description: "Password (minimum 8 characters)" },
                roles: { type: "array", items: { type: "string", enum: ["USER", "ADMIN"] } },
                avatar: { type: "string", format: "binary", description: "Avatar image (max 5MB)" },
                deleteAvatar: {
                    type: "string",
                    enum: ["true", "false"],
                    description: "Set to 'true' to delete avatar",
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: "User updated successfully", type: UserResponseDTO })
    @ApiResponse({ status: 400, description: "Validation error" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 404, description: "User not found" })
    @ApiResponse({ status: 409, description: "Email/username already taken" })
    update(@Param("id") id: string, @Body() body: UpdateUserDTO, @UploadedFile() avatar?: Express.Multer.File) {
        const environment = this.configService.get("NODE_ENV", { infer: true }) ?? "development";
        const deleteAvatar = body.deleteAvatar === "true";

        return this.usersService.update(id, body, {
            avatar,
            deleteAvatar,
            environment,
        });
    }

    @Delete(":id")
    @ApiOperation({ summary: "Delete user", description: "Delete a user account" })
    @ApiParam({ name: "id", type: String, description: "User UUID" })
    @ApiResponse({ status: 200, description: "User deleted successfully", type: UserResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 404, description: "User not found" })
    remove(@Param("id") id: string) {
        return this.usersService.remove(id);
    }
}
