import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";

import { IdentityModule } from "../@shared/modules/identity.module";
import { AuthGuard } from "./guards/auth.guard";

import type { Env } from "@/env/env";
import { AuthController } from "@/http/auth/controllers/auth.controller";
import { AuthService } from "@/http/auth/services/auth.service";
import { GoogleAuthProvider } from "@/infra/auth/providers/google-auth.provider";
import { PasswordAuthProvider } from "@/infra/auth/providers/password-auth.provider";

@Module({
    imports: [
        IdentityModule,
        JwtModule.registerAsync({
            global: true,
            inject: [ConfigService],
            useFactory: (configService: ConfigService<Env, true>) => {
                const privateKey = configService.get("JWT_PRIVATE_KEY", { infer: true });
                const publicKey = configService.get("JWT_PUBLIC_KEY", { infer: true });

                return {
                    signOptions: { expiresIn: "1d", algorithm: "RS256" },
                    privateKey: Buffer.from(privateKey, "base64"),
                    publicKey: Buffer.from(publicKey, "base64"),
                };
            },
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        {
            provide: APP_GUARD,
            useClass: AuthGuard,
        },

        // Providers
        {
            provide: "GoogleAuthProvider",
            useClass: GoogleAuthProvider,
        },
        {
            provide: "PasswordAuthProvider",
            useClass: PasswordAuthProvider,
        },
    ],
})
export class AuthModule {}
