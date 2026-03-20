import { ROLES, User } from "../../../enterprise/entities/user.entity";
import { AUTH_METHOD_VARIATIONS } from "../../../enterprise/value-objects/auth-method.vo";
import { Username } from "../../../enterprise/value-objects/username.vo";
import { InvalidCredentialsError } from "../../../errors/invalid-credentials.error";
import { MissingCredentialsError } from "../../../errors/missing-credentials.error";
import { UserNotFoundError } from "../../../errors/user-not-found.error";
import { IGoogleAuthProvider } from "../../providers/google-auth.provider";
import { IPasswordAuthProvider } from "../../providers/password-auth.provider";
import { UsersRepository } from "../../repositories/users.repository";
import { AuthenticateUseCase } from "../../use-cases/authenticate.use-case";
import { CreateUserUseCase } from "../../use-cases/create-user.use-case";

import { Right } from "@/domain/@shared/either";

const makeUser = (
    overrides: Partial<{ username: string; email: string; id: string; passwordHash?: string }> = {},
): User => {
    return User.create(
        {
            username: Username.create(overrides.username ?? "testuser"),
            email: overrides.email ?? "test@example.com",
            passwordHash: overrides.passwordHash ?? "hashed_password",
            roles: [ROLES.USER],
        },
        overrides.id,
    );
};

const makeUsersRepository = (): jest.Mocked<UsersRepository> => ({
    list: jest.fn(),
    findById: jest.fn(),
    findByUsername: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
});

const makeGoogleAuthProvider = (): jest.Mocked<IGoogleAuthProvider> => ({
    getRedirectUrl: jest.fn(),
    getUserFromCode: jest.fn(),
});

const makePasswordAuthProvider = (): jest.Mocked<IPasswordAuthProvider> => ({
    hash: jest.fn(),
    compare: jest.fn(),
});

const makeCreateUserUseCase = (): jest.Mocked<CreateUserUseCase> =>
    ({
        execute: jest.fn(),
    }) as unknown as jest.Mocked<CreateUserUseCase>;

describe("AuthenticateUseCase", () => {
    let sut: AuthenticateUseCase;
    let createUserUseCase: jest.Mocked<CreateUserUseCase>;
    let usersRepository: jest.Mocked<UsersRepository>;
    let googleAuthProvider: jest.Mocked<IGoogleAuthProvider>;
    let passwordAuthProvider: jest.Mocked<IPasswordAuthProvider>;

    beforeEach(() => {
        createUserUseCase = makeCreateUserUseCase();
        usersRepository = makeUsersRepository();
        googleAuthProvider = makeGoogleAuthProvider();
        passwordAuthProvider = makePasswordAuthProvider();
        sut = new AuthenticateUseCase(createUserUseCase, usersRepository, googleAuthProvider, passwordAuthProvider);
    });

    describe("Password Authentication", () => {
        it("should authenticate user with email and password", async () => {
            const user = makeUser({ email: "user@example.com" });
            usersRepository.findByEmail.mockResolvedValue(user);
            passwordAuthProvider.compare.mockResolvedValue(true);

            const result = await sut.execute({
                method: AUTH_METHOD_VARIATIONS.PASSWORD,
                email: "user@example.com",
                password: "correct_password",
            });

            expect(result.isRight()).toBe(true);
            if (result.isRight()) {
                expect(result.value.user.email).toBe("user@example.com");
            }
        });

        it("should authenticate user with username and password", async () => {
            const user = makeUser({ username: "validuser" });
            usersRepository.findByUsername.mockResolvedValue(user);
            passwordAuthProvider.compare.mockResolvedValue(true);

            const result = await sut.execute({
                method: AUTH_METHOD_VARIATIONS.PASSWORD,
                username: "validuser",
                password: "correct_password",
            });

            expect(result.isRight()).toBe(true);
            if (result.isRight()) {
                expect(result.value.user.username).toBe("validuser");
            }
        });

        it("should return MissingCredentialsError when email/username not provided", async () => {
            const result = await sut.execute({
                method: AUTH_METHOD_VARIATIONS.PASSWORD,
                password: "some_password",
            });

            expect(result.isLeft()).toBe(true);
            if (result.isLeft()) {
                expect(result.value).toBeInstanceOf(MissingCredentialsError);
            }
        });

        it("should return MissingCredentialsError when password not provided", async () => {
            const result = await sut.execute({
                method: AUTH_METHOD_VARIATIONS.PASSWORD,
                email: "user@example.com",
                password: "",
            });

            expect(result.isLeft()).toBe(true);
            if (result.isLeft()) {
                expect(result.value).toBeInstanceOf(MissingCredentialsError);
            }
        });

        it("should return UserNotFoundError when user does not exist", async () => {
            usersRepository.findByEmail.mockResolvedValue(null);

            const result = await sut.execute({
                method: AUTH_METHOD_VARIATIONS.PASSWORD,
                email: "nonexistent@example.com",
                password: "some_password",
            });

            expect(result.isLeft()).toBe(true);
            if (result.isLeft()) {
                expect(result.value).toBeInstanceOf(UserNotFoundError);
            }
        });

        it("should return InvalidCredentialsError when password is incorrect", async () => {
            const user = makeUser();
            usersRepository.findByEmail.mockResolvedValue(user);
            passwordAuthProvider.compare.mockResolvedValue(false);

            const result = await sut.execute({
                method: AUTH_METHOD_VARIATIONS.PASSWORD,
                email: "user@example.com",
                password: "wrong_password",
            });

            expect(result.isLeft()).toBe(true);
            if (result.isLeft()) {
                expect(result.value).toBeInstanceOf(InvalidCredentialsError);
            }
        });

        it("should return InvalidCredentialsError when user has no password hash", async () => {
            const user = makeUser({ passwordHash: undefined });
            usersRepository.findByEmail.mockResolvedValue(user);

            const result = await sut.execute({
                method: AUTH_METHOD_VARIATIONS.PASSWORD,
                email: "user@example.com",
                password: "some_password",
            });

            expect(result.isLeft()).toBe(true);
            if (result.isLeft()) {
                expect(result.value).toBeInstanceOf(InvalidCredentialsError);
            }
        });
    });

    describe("Google OAuth Authentication", () => {
        it("should authenticate existing user with Google OAuth", async () => {
            const user = makeUser({ email: "google@example.com" });
            googleAuthProvider.getUserFromCode.mockResolvedValue({
                id: "google-123",
                email: "google@example.com",
                name: "Google User",
            });
            usersRepository.findByEmail.mockResolvedValue(user);

            const result = await sut.execute({
                method: AUTH_METHOD_VARIATIONS.GOOGLE_OAUTH,
                code: "valid_google_code",
            });

            expect(result.isRight()).toBe(true);
            if (result.isRight()) {
                expect(result.value.user.email).toBe("google@example.com");
            }
        });

        it("should create new user when Google user does not exist", async () => {
            const newUser = makeUser({ email: "newgoogle@example.com", username: "google_user" });
            googleAuthProvider.getUserFromCode.mockResolvedValue({
                id: "google-new",
                email: "newgoogle@example.com",
                name: "Google User",
            });
            usersRepository.findByEmail.mockResolvedValue(null);
            usersRepository.findByUsername.mockResolvedValue(null);
            createUserUseCase.execute.mockResolvedValue(Right.call({ user: newUser }));

            const result = await sut.execute({
                method: AUTH_METHOD_VARIATIONS.GOOGLE_OAUTH,
                code: "valid_google_code",
            });

            expect(result.isRight()).toBe(true);
            expect(createUserUseCase.execute).toHaveBeenCalled();
        });

        it("should return MissingCredentialsError when code not provided", async () => {
            const result = await sut.execute({
                method: AUTH_METHOD_VARIATIONS.GOOGLE_OAUTH,
                code: "",
            });

            expect(result.isLeft()).toBe(true);
            if (result.isLeft()) {
                expect(result.value).toBeInstanceOf(MissingCredentialsError);
            }
        });

        it("should generate unique username when username already taken", async () => {
            const existingUser = makeUser({ username: "google_user" });
            const newUser = makeUser({ email: "newgoogle@example.com", username: "google_user_12345" });

            googleAuthProvider.getUserFromCode.mockResolvedValue({
                id: "google-new",
                email: "newgoogle@example.com",
                name: "Google User",
            });
            usersRepository.findByEmail.mockResolvedValue(null);
            usersRepository.findByUsername.mockResolvedValue(existingUser);
            createUserUseCase.execute.mockResolvedValue(Right.call({ user: newUser }));

            const result = await sut.execute({
                method: AUTH_METHOD_VARIATIONS.GOOGLE_OAUTH,
                code: "valid_google_code",
            });

            expect(result.isRight()).toBe(true);
            expect(createUserUseCase.execute).toHaveBeenCalled();
        });
    });
});
