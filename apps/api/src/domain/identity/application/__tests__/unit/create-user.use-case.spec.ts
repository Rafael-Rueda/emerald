import { ROLES, User } from "../../../enterprise/entities/user.entity";
import { Username } from "../../../enterprise/value-objects/username.vo";
import { UserAlreadyExistsError } from "../../../errors/user-already-exists.error";
import { UsersRepository } from "../../repositories/users.repository";
import { CreateUserUseCase } from "../../use-cases/create-user.use-case";

import { BcryptHashProvider } from "@/infra/cryptography/providers/bcrypt.provider";

const makeUser = (overrides: Partial<{ username: string; email: string; id: string }> = {}): User => {
    return User.create(
        {
            username: Username.create(overrides.username ?? "testuser"),
            email: overrides.email ?? "test@example.com",
            passwordHash: "hashed_password",
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

const makeBcryptHashProvider = (): jest.Mocked<BcryptHashProvider> =>
    ({
        SALT_ROUNDS: 6,
        hash: jest.fn().mockResolvedValue("hashed_password"),
        compare: jest.fn(),
    }) as unknown as jest.Mocked<BcryptHashProvider>;

describe("CreateUserUseCase", () => {
    let sut: CreateUserUseCase;
    let usersRepository: jest.Mocked<UsersRepository>;
    let bcryptHashProvider: jest.Mocked<BcryptHashProvider>;

    beforeEach(() => {
        usersRepository = makeUsersRepository();
        bcryptHashProvider = makeBcryptHashProvider();
        sut = new CreateUserUseCase(usersRepository, bcryptHashProvider);
    });

    it("should create a new user successfully", async () => {
        usersRepository.findByEmail.mockResolvedValue(null);
        usersRepository.findByUsername.mockResolvedValue(null);
        usersRepository.create.mockImplementation(async (user) => user);

        const result = await sut.execute({
            username: "newuser",
            email: "new@example.com",
            roles: [ROLES.USER],
            passwordHash: "password123",
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.user.email).toBe("new@example.com");
            expect(result.value.user.username).toBe("newuser");
        }
        expect(usersRepository.create).toHaveBeenCalledTimes(1);
        expect(bcryptHashProvider.hash).toHaveBeenCalledWith("password123");
    });

    it("should create an admin user when admin flag is true", async () => {
        usersRepository.findByEmail.mockResolvedValue(null);
        usersRepository.findByUsername.mockResolvedValue(null);
        usersRepository.create.mockImplementation(async (user) => user);

        const result = await sut.execute({
            username: "adminuser",
            email: "admin@example.com",
            roles: [ROLES.ADMIN],
            admin: true,
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.user.roles).toContain(ROLES.USER);
        }
    });

    it("should return UserAlreadyExistsError when email already exists", async () => {
        const existingUser = makeUser({ email: "existing@example.com" });
        usersRepository.findByEmail.mockResolvedValue(existingUser);
        usersRepository.findByUsername.mockResolvedValue(null);

        const result = await sut.execute({
            username: "newuser",
            email: "existing@example.com",
            roles: [ROLES.USER],
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(UserAlreadyExistsError);
        }
        expect(usersRepository.create).not.toHaveBeenCalled();
    });

    it("should return UserAlreadyExistsError when username already exists", async () => {
        const existingUser = makeUser({ username: "existinguser" });
        usersRepository.findByEmail.mockResolvedValue(null);
        usersRepository.findByUsername.mockResolvedValue(existingUser);

        const result = await sut.execute({
            username: "existinguser",
            email: "new@example.com",
            roles: [ROLES.USER],
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(UserAlreadyExistsError);
        }
        expect(usersRepository.create).not.toHaveBeenCalled();
    });

    it("should create user without password hash when not provided", async () => {
        usersRepository.findByEmail.mockResolvedValue(null);
        usersRepository.findByUsername.mockResolvedValue(null);
        usersRepository.create.mockImplementation(async (user) => user);

        const result = await sut.execute({
            username: "nopassworduser",
            email: "nopass@example.com",
            roles: [ROLES.USER],
        });

        expect(result.isRight()).toBe(true);
        expect(bcryptHashProvider.hash).not.toHaveBeenCalled();
    });
});
