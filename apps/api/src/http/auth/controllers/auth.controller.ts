import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Redirect } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { Public } from "../decorators/public.decorator";

import { Validator } from "@/http/@shared/decorators/validator.decorator";
import {
    AuthResponseDTO,
    GoogleCallbackDTO,
    googleCallbackSchema,
    GoogleRedirectResponseDTO,
    LoginWithPasswordDTO,
    loginWithPasswordSchema,
} from "@/http/auth/schemas/auth.schema";
import { AuthService } from "@/http/auth/services/auth.service";

@ApiTags("Auth")
@Controller("/auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Public()
    @Post("/login")
    @HttpCode(HttpStatus.OK)
    @Validator(loginWithPasswordSchema)
    @ApiOperation({ summary: "Login with password", description: "Authenticate user with email/username and password" })
    @ApiBody({ type: LoginWithPasswordDTO })
    @ApiResponse({ status: 200, description: "Login successful", type: AuthResponseDTO })
    @ApiResponse({ status: 401, description: "Invalid credentials" })
    @ApiResponse({ status: 400, description: "Validation error" })
    async loginWithPassword(@Body() body: LoginWithPasswordDTO) {
        return this.authService.loginWithPassword(body);
    }

    @Public()
    @Get("/google")
    @Redirect()
    @ApiOperation({ summary: "Google OAuth redirect", description: "Redirects to Google OAuth consent screen" })
    @ApiResponse({ status: 302, description: "Redirect to Google OAuth", type: GoogleRedirectResponseDTO })
    googleRedirect() {
        const url = this.authService.getGoogleRedirectUrl();
        return { url };
    }

    @Public()
    @Get("/google/callback")
    @Validator(googleCallbackSchema)
    @ApiOperation({
        summary: "Google OAuth callback",
        description: "Handle Google OAuth callback and authenticate user",
    })
    @ApiResponse({ status: 200, description: "Login successful", type: AuthResponseDTO })
    @ApiResponse({ status: 401, description: "Invalid OAuth code" })
    async googleCallback(@Query() query: GoogleCallbackDTO) {
        return this.authService.loginWithGoogle(query);
    }
}
