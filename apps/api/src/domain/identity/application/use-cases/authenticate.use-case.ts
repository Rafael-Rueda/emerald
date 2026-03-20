import { ROLES, User } from "../../enterprise/entities/user.entity";
import { AUTH_METHOD_VARIATIONS } from "../../enterprise/value-objects/auth-method.vo";
import { Username } from "../../enterprise/value-objects/username.vo";
import { InvalidAuthMethodError } from "../../errors/invalid-auth-method.error";
import { InvalidCredentialsError } from "../../errors/invalid-credentials.error";
import { MissingCredentialsError } from "../../errors/missing-credentials.error";
import { UserNotFoundError } from "../../errors/user-not-found.error";
import { IGoogleAuthProvider } from "../providers/google-auth.provider";
import { IPasswordAuthProvider } from "../providers/password-auth.provider";
import { UsersRepository } from "../repositories/users.repository";
import { CreateUserUseCase } from "./create-user.use-case";

import { Either, Left, Right } from "@/domain/@shared/either";

interface AuthenticateWithPasswordRequest {
    method: typeof AUTH_METHOD_VARIATIONS.PASSWORD;
    email?: string;
    username?: string;
    password: string;
}

interface AuthenticateWithGoogleRequest {
    method: typeof AUTH_METHOD_VARIATIONS.GOOGLE_OAUTH;
    code: string;
}

type AuthenticateRequest = AuthenticateWithPasswordRequest | AuthenticateWithGoogleRequest;

type AuthenticateError = InvalidAuthMethodError | InvalidCredentialsError | MissingCredentialsError | UserNotFoundError;

type AuthenticateResponse = Either<AuthenticateError, { user: User }>;

export class AuthenticateUseCase {
    constructor(
        private createUserUseCase: CreateUserUseCase,
        private usersRepository: UsersRepository,
        private googleAuthProvider: IGoogleAuthProvider,
        private passwordAuthProvider: IPasswordAuthProvider,
    ) {}

    async execute(request: AuthenticateRequest): Promise<AuthenticateResponse> {
        switch (request.method) {
            case AUTH_METHOD_VARIATIONS.PASSWORD:
                return this.authenticateWithPassword(request);

            case AUTH_METHOD_VARIATIONS.GOOGLE_OAUTH:
                return this.authenticateWithGoogle(request);

            default: {
                const _exhaustiveCheck: never = request;
                return Left.call(new InvalidAuthMethodError(String(_exhaustiveCheck)));
            }
        }
    }

    private async authenticateWithPassword(request: AuthenticateWithPasswordRequest): Promise<AuthenticateResponse> {
        const { email, password, username } = request;

        if (!email && !username) {
            return Left.call(new MissingCredentialsError("email/username"));
        }

        if (!password) {
            return Left.call(new MissingCredentialsError("password"));
        }

        let user;

        if (email) {
            user = await this.usersRepository.findByEmail(email);
        }

        if (username) {
            user = await this.usersRepository.findByUsername(username);
        }

        if (!user) {
            return Left.call(new UserNotFoundError());
        }

        if (!user.passwordHash) {
            return Left.call(new InvalidCredentialsError());
        }

        const isPasswordValid = await this.passwordAuthProvider.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            return Left.call(new InvalidCredentialsError());
        }

        return Right.call({ user });
    }

    private async authenticateWithGoogle(request: AuthenticateWithGoogleRequest): Promise<AuthenticateResponse> {
        const { code } = request;

        if (!code) {
            return Left.call(new MissingCredentialsError("code"));
        }

        const googleUser = await this.googleAuthProvider.getUserFromCode(code);

        let user = await this.usersRepository.findByEmail(googleUser.email);
        const username = Username.create(googleUser.name).toString();

        if (!user) {
            const usernameAlreadyTaken = await this.usersRepository.findByUsername(username);

            const response = await this.createUserUseCase.execute({
                username: usernameAlreadyTaken
                    ? Username.generateUniqueFrom(username).toString()
                    : username,
                email: googleUser.email,
                passwordHash: undefined,
                roles: [ROLES.VIEWER],
            });

            if (response.isLeft()) {
                return Left.call(new InvalidCredentialsError());
            }

            user = response.value.user;
        } else {
            let shouldUpdateUser = false;

            if (user.username !== username) {
                const existingUsernameOwner = await this.usersRepository.findByUsername(username);
                const hasDifferentUserWithUsername =
                    existingUsernameOwner && existingUsernameOwner.id.toString() !== user.id.toString();

                user.username = hasDifferentUserWithUsername ? Username.generateUniqueFrom(username).toString() : username;
                shouldUpdateUser = true;
            }

            if (!user.roles.length) {
                user.roles = [ROLES.VIEWER];
                shouldUpdateUser = true;
            }

            if (shouldUpdateUser) {
                const updatedUser = await this.usersRepository.update(user);

                if (updatedUser) {
                    user = updatedUser;
                }
            }
        }

        return Right.call({ user });
    }
}
