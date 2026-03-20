import { BadRequestException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import type { IGoogleAuthProvider } from "@/domain/identity/application/providers/google-auth.provider";
import type { IPasswordAuthProvider } from "@/domain/identity/application/providers/password-auth.provider";
import type { UsersRepository } from "@/domain/identity/application/repositories/users.repository";
import { AuthenticateUseCase } from "@/domain/identity/application/use-cases/authenticate.use-case";
import { CreateUserUseCase } from "@/domain/identity/application/use-cases/create-user.use-case";
import { AUTH_METHOD_VARIATIONS } from "@/domain/identity/enterprise/value-objects/auth-method.vo";
import { UserPresenter } from "@/http/@shared/presenters/user.presenter";
import { GoogleCallbackDTO, LoginWithPasswordDTO } from "@/http/auth/schemas/auth.schema";

@Injectable()
export class AuthService {
    private authenticateUseCase: AuthenticateUseCase;

    constructor(
        @Inject("CreateUserUseCase")
        private createUserUseCase: CreateUserUseCase,
        @Inject("UsersRepository")
        private usersRepository: UsersRepository,
        @Inject("GoogleAuthProvider")
        private googleAuthProvider: IGoogleAuthProvider,
        @Inject("PasswordAuthProvider")
        private passwordAuthProvider: IPasswordAuthProvider,
        private jwtService: JwtService,
    ) {
        this.authenticateUseCase = new AuthenticateUseCase(
            this.createUserUseCase,
            this.usersRepository,
            this.googleAuthProvider,
            this.passwordAuthProvider,
        );
    }

    getGoogleRedirectUrl(): string {
        return this.googleAuthProvider.getRedirectUrl();
    }

    async loginWithPassword(dto: LoginWithPasswordDTO) {
        const result = await this.authenticateUseCase.execute({
            method: AUTH_METHOD_VARIATIONS.PASSWORD,
            email: dto.email,
            username: dto.username,
            password: dto.password,
        });

        if (result.isLeft()) {
            const error = result.value;
            if (error.name === "UserNotFoundError" || error.name === "InvalidCredentialsError") {
                throw new UnauthorizedException(error.message);
            }
            throw new BadRequestException(error.message);
        }

        const user = result.value;
        const payload = UserPresenter.toHTTP(user.user);

        return {
            user: payload,
            accessToken: this.jwtService.sign(payload),
        };
    }

    async loginWithGoogle(dto: GoogleCallbackDTO) {
        const result = await this.authenticateUseCase.execute({
            method: AUTH_METHOD_VARIATIONS.GOOGLE_OAUTH,
            code: dto.code,
        });

        if (result.isLeft()) {
            const error = result.value;
            throw new BadRequestException(error.message);
        }

        const user = result.value;
        const payload = UserPresenter.toHTTP(user.user);

        return {
            user: payload,
            accessToken: this.jwtService.sign(payload),
        };
    }
}
