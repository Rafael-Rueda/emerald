import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
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

const BYTES_PER_MB = 1024 * 1024;
const DEFAULT_MAX_FILE_SIZE_MB = 10;
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];

@ApiTags("Storage")
@ApiBearerAuth("JWT-auth")
@Controller("/api/storage")
export class StorageController {
    constructor(
        private storageService: StorageService,
        private configService: ConfigService<Env, true>,
    ) {}

    private getMaxFileSizeBytes() {
        const maxFileSizeMb = this.configService.get("MAX_FILE_SIZE_MB", { infer: true }) ?? DEFAULT_MAX_FILE_SIZE_MB;
        return maxFileSizeMb * BYTES_PER_MB;
    }

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
                    description: "Image file to upload (max size configured by MAX_FILE_SIZE_MB)",
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
    @ApiResponse({ status: 400, description: "Missing file, invalid MIME type, or oversized file" })
    @ApiResponse({ status: 401, description: "Unauthorized" })
    async upload(@UploadedFile() file: Express.Multer.File | undefined, @Body() body: UploadFileBodyDTO) {
        if (!file) {
            throw new BadRequestException("File is required");
        }

        const maxSizeBytes = this.getMaxFileSizeBytes();

        const result = await this.storageService.upload({
            entityType: body.entityType,
            entityId: body.entityId,
            field: body.field,
            file,
            environment: this.configService.get("NODE_ENV", { infer: true }) ?? "development",
            validationOptions: {
                allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
                maxSizeBytes,
            },
        });

        return { url: result.url };
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
