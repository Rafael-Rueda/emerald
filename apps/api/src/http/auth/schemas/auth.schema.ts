import { createZodDto } from "nestjs-zod";
import z from "zod";

export const loginWithPasswordSchema = z
    .object({
        email: z.email().optional().describe("User email address"),
        username: z.string().min(3).max(24).optional().describe("Username"),
        password: z.string().min(8).describe("User password"),
    })
    .refine((data) => data.email || data.username, {
        message: "Email or username is required",
    });

export class LoginWithPasswordDTO extends createZodDto(loginWithPasswordSchema) {}

export const googleCallbackSchema = z.object({
    code: z.string().describe("Google OAuth authorization code"),
});

export class GoogleCallbackDTO extends createZodDto(googleCallbackSchema) {}

// Response DTOs
export const authResponseSchema = z.object({
    accessToken: z.string().describe("JWT access token"),
    user: z.object({
        id: z.uuid().describe("User unique identifier"),
        username: z.string().describe("Username"),
        email: z.email().describe("User email address"),
        roles: z.array(z.enum(["USER", "ADMIN"])).describe("User roles"),
    }),
});

export class AuthResponseDTO extends createZodDto(authResponseSchema) {}

export const googleRedirectResponseSchema = z.object({
    url: z.url().describe("Google OAuth redirect URL"),
});

export class GoogleRedirectResponseDTO extends createZodDto(googleRedirectResponseSchema) {}
