import {
    Body,
    Controller,
    Delete,
    Get,
    MaxFileSizeValidator,
    Param,
    ParseFilePipe,
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
    DeleteResponseDTO,
    FileUrlQueryDTO,
    fileUrlQuerySchema,
    FileUrlResponseDTO,
    UploadFileBodyDTO,
    uploadFileBodySchema,
    UploadResponseDTO,
} from "../schemas/storage.schema";
import { StorageService } from "../services/storage.service";

import type { Env } from "@/env/env";
import { Validator } from "@/http/@shared/decorators/validator.decorator";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags("Storage")
@ApiBearerAuth("JWT-auth")
@Controller("storage")
export class StorageController {
    constructor(
        private storageService: StorageService,
        private configService: ConfigService<Env, true>,
    ) {}

    @Post("upload")
    @UseInterceptors(FileInterceptor("file"))
    @Validator(uploadFileBodySchema)
    @ApiOperation({ summary: "Upload file", description: "Upload a file and associate it with an entity" })
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        description: "File upload with entity association",
        schema: {
            type: "object",
            required: ["file", "entityType", "entityId", "field"],
            properties: {
                file: {
                    type: "string",
                    format: "binary",
                    description: "File to upload (max 10MB)",
                },
                entityType: {
                    type: "string",
                    description: "Entity type (e.g., 'user', 'product')",
                    example: "user",
                },
                entityId: {
                    type: "string",
                    format: "uuid",
                    description: "Entity unique identifier",
                },
                field: {
                    type: "string",
                    description: "Field name (e.g., 'avatar', 'gallery')",
                    example: "avatar",
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: "File uploaded successfully", type: UploadResponseDTO })
    @ApiResponse({ status: 400, description: "Validation error or invalid file type" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 413, description: "File too large" })
    async upload(
        @UploadedFile(
            new ParseFilePipe({
                validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
            }),
        )
        file: Express.Multer.File,
        @Body() body: UploadFileBodyDTO,
    ) {
        const result = await this.storageService.upload({
            entityType: body.entityType,
            entityId: body.entityId,
            field: body.field,
            file,
            environment: this.configService.get("NODE_ENV", { infer: true }) ?? "development",
            validationOptions: {
                allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"],
                maxSizeBytes: MAX_FILE_SIZE,
            },
        });

        return {
            id: result.file.id.toString(),
            filename: result.file.filename,
            path: result.file.path.toString(),
            mimeType: result.file.mimeType,
            size: result.file.size,
            width: result.file.width ?? null,
            height: result.file.height ?? null,
        };
    }

    @Get("file/:fileId")
    @Validator(fileUrlQuerySchema)
    @ApiOperation({ summary: "Get file URL", description: "Get the URL for a specific file by its ID" })
    @ApiParam({ name: "fileId", type: String, description: "File UUID" })
    @ApiQuery({ name: "signed", required: false, type: Boolean, description: "Return signed URL (default: false)" })
    @ApiQuery({
        name: "expiresInMinutes",
        required: false,
        type: Number,
        description: "Signed URL expiration (default: 60)",
    })
    @ApiResponse({ status: 200, description: "File URL retrieved", type: FileUrlResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 404, description: "File not found" })
    async getFileUrl(@Param("fileId") fileId: string, @Query() query: FileUrlQueryDTO) {
        return this.storageService.getFileUrl(fileId, query.signed, query.expiresInMinutes);
    }

    @Get("entity/:entityType/:entityId/:field")
    @Validator(fileUrlQuerySchema)
    @ApiOperation({ summary: "Get entity file URL", description: "Get the URL for a file associated with an entity" })
    @ApiParam({ name: "entityType", type: String, description: "Entity type (e.g., 'user')" })
    @ApiParam({ name: "entityId", type: String, description: "Entity UUID" })
    @ApiParam({ name: "field", type: String, description: "Field name (e.g., 'avatar')" })
    @ApiQuery({ name: "signed", required: false, type: Boolean, description: "Return signed URL (default: false)" })
    @ApiQuery({
        name: "expiresInMinutes",
        required: false,
        type: Number,
        description: "Signed URL expiration (default: 60)",
    })
    @ApiResponse({ status: 200, description: "File URL retrieved", type: FileUrlResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 404, description: "File not found" })
    async getEntityFileUrl(
        @Param("entityType") entityType: string,
        @Param("entityId") entityId: string,
        @Param("field") field: string,
        @Query() query: FileUrlQueryDTO,
    ) {
        return this.storageService.getEntityFileUrl(entityType, entityId, field, query.signed, query.expiresInMinutes);
    }

    @Delete("file/:fileId")
    @ApiOperation({ summary: "Delete file", description: "Delete a file from storage" })
    @ApiParam({ name: "fileId", type: String, description: "File UUID" })
    @ApiResponse({ status: 200, description: "File deleted successfully", type: DeleteResponseDTO })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    @ApiResponse({ status: 404, description: "File not found" })
    async deleteFile(@Param("fileId") fileId: string) {
        const result = await this.storageService.delete(fileId);
        return {
            file: {
                id: result.file.id.toString(),
                entityType: result.file.entityType,
                entityId: result.file.entityId,
                field: result.file.field,
                filename: result.file.filename,
                path: result.file.path.toString(),
                mimeType: result.file.mimeType,
                size: result.file.size,
                width: result.file.width ?? null,
                height: result.file.height ?? null,
            },
        };
    }
}
