import { createZodDto } from "nestjs-zod";
import z from "zod";

// Query params for listing users
export const listUsersQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1).describe("Page number"),
    limit: z.coerce.number().min(1).max(100).default(10).describe("Items per page"),
});

export class ListUsersQueryDTO extends createZodDto(listUsersQuerySchema) {}

// Path params for single user operations
export const userIdParamSchema = z.object({
    id: z.uuid().describe("User unique identifier"),
});

export class UserIdParamDTO extends createZodDto(userIdParamSchema) {}

// Body for creating user
export const createUserBodySchema = z.object({
    username: z.string().min(3).max(24).describe("Username (3-24 characters)"),
    email: z.email().describe("User email address"),
    password: z.string().min(8).describe("Password (minimum 8 characters)"),
});

export class CreateUserDTO extends createZodDto(createUserBodySchema) {}

// Body for updating user
export const updateUserBodySchema = z.object({
    username: z.string().min(3).max(24).optional().describe("Username (3-24 characters)"),
    email: z.email().optional().describe("User email address"),
    password: z.string().min(8).optional().describe("Password (minimum 8 characters)"),
    roles: z
        .array(z.enum(["USER", "ADMIN", "SUPER_ADMIN", "AUTHOR", "VIEWER"]))
        .optional()
        .describe("User roles"),
    deleteAvatar: z.enum(["true", "false"]).optional().describe("Set to 'true' to delete avatar"),
});

export class UpdateUserDTO extends createZodDto(updateUserBodySchema) {}

// Response DTO for user (based on UserPresenter.toHTTP)
export const userResponseSchema = z.object({
    id: z.uuid().describe("User unique identifier"),
    username: z.string().describe("Username"),
    email: z.email().describe("User email address"),
    roles: z.array(z.enum(["USER", "ADMIN", "SUPER_ADMIN", "AUTHOR", "VIEWER"])).describe("User roles"),
    avatarUrl: z.string().nullable().describe("User avatar URL"),
});

export class UserResponseDTO extends createZodDto(userResponseSchema) {}
