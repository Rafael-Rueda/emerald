import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

import { IGoogleAuthProvider, IGoogleUser } from "@/domain/identity/application/providers/google-auth.provider";
import type { Env } from "@/env/env";

@Injectable()
export class GoogleAuthProvider implements IGoogleAuthProvider {
    private googleClient: OAuth2Client;

    constructor(configService: ConfigService<Env, true>) {
        this.googleClient = new google.auth.OAuth2(
            configService.get("GOOGLE_OAUTH2_CLIENT_ID", { infer: true }),
            configService.get("GOOGLE_OAUTH2_CLIENT_SECRET", { infer: true }),
            configService.get("GOOGLE_OAUTH2_REDIRECT_URL", { infer: true }),
        );
    }

    getRedirectUrl(): string {
        return this.googleClient.generateAuthUrl({
            access_type: "offline",
            scope: [
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/userinfo.email",
            ],
        });
    }

    async getUserFromCode(code: string): Promise<IGoogleUser> {
        // 1. Exchange the authorization code for tokens
        const { tokens } = await this.googleClient.getToken(code);
        this.googleClient.setCredentials(tokens);

        // 2. Fetch user data using the oauth2 lib
        const googleProfileApi = google.oauth2({ version: "v2", auth: this.googleClient });
        const { data } = await googleProfileApi.userinfo.get();

        // 3. Return a clean object, decoupling the lib from the rest of the app
        return {
            id: data.id as string,
            email: data.email as string,
            name: data.name as string,
        };
    }
}
