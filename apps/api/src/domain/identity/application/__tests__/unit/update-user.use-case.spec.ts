import { ROLES, User } from "../../../enterprise/entities/user.entity";
import { Username } from "../../../enterprise/value-objects/username.vo";
import { UserAlreadyExistsError } from "../../../errors/user-already-exists.error";
import { UserNotFoundError } from "../../../errors/user-not-found.error";
import { UsersRepository } from "../../repositories/users.repository";
import { UpdateUserUseCase } from "../../use-cases/update-user.use-case";

import { BcryptHashProvider } from "@/infra/cryptography/providers/bcrypt.provider";

const makeUser = (overrides: Partial<{ username: string; email: string; id: string }> = {}): User => {
    return User.create(
        {
            username: Username.create(overrides.username ?? "testuser"),
            email: overrides.email ?? "test@example.com",
            passwordHash: "hashed_password",
            roles: [ROLES.USER],
        },
        overrides.id ?? "user-123",
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
        hash: jest.fn().mockResolvedValue("new_hashed_password"),
        compare: jest.fn(),
    }) as unknown as jest.Mocked<BcryptHashProvider>;

describe("UpdateUserUseCase", () => {
    let sut: UpdateUserUseCase;
    let usersRepository: jest.Mocked<UsersRepository>;
    let bcryptHashProvider: jest.Mocked<BcryptHashProvider>;

    beforeEach(() => {
        usersRepository = makeUsersRepository();
        bcryptHashProvider = makeBcryptHashProvider();
        sut = new UpdateUserUseCase(usersRepository, bcryptHashProvider);
    });

    it("should update user email successfully", async () => {
        const user = makeUser();
        usersRepository.findById.mockResolvedValue(user);
        usersRepository.findByEmail.mockResolvedValue(null);
        usersRepository.update.mockImplementation(async (u) => u);

        const result = await sut.execute({
            userId: "user-123",
            email: "newemail@example.com",
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.user.email).toBe("newemail@example.com");
        }
    });

    it("should update user username successfully", async () => {
        const user = makeUser();
        usersRepository.findById.mockResolvedValue(user);
        usersRepository.findByUsername.mockResolvedValue(null);
        usersRepository.update.mockImplementation(async (u) => u);

        const result = await sut.execute({
            userId: "user-123",
            username: "newusername",
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.user.username).toBe("newusername");
        }
    });

    it("should update user password successfully", async () => {
        const user = makeUser();
        usersRepository.findById.mockResolvedValue(user);
        usersRepository.update.mockImplementation(async (u) => u);

        const result = await sut.execute({
            userId: "user-123",
            password: "newpassword123",
        });

        expect(result.isRight()).toBe(true);
        expect(bcryptHashProvider.hash).toHaveBeenCalledWith("newpassword123");
        if (result.isRight()) {
            expect(result.value.user.passwordHash).toBe("new_hashed_password");
        }
    });

    it("should update user roles successfully", async () => {
        const user = makeUser();
        usersRepository.findById.mockResolvedValue(user);
        usersRepository.update.mockImplementation(async (u) => u);

        const result = await sut.execute({
            userId: "user-123",
            roles: [ROLES.ADMIN, ROLES.USER],
        });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.user.roles).toContain(ROLES.ADMIN);
            expect(result.value.user.roles).toContain(ROLES.USER);
        }
    });

    it("should return UserNotFoundError when user does not exist", async () => {
        usersRepository.findById.mockResolvedValue(null);

        const result = await sut.execute({
            userId: "non-existent-id",
            email: "newemail@example.com",
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(UserNotFoundError);
        }
    });

    it("should return UserAlreadyExistsError when email is already taken", async () => {
        const user = makeUser();
        const existingUser = makeUser({ email: "taken@example.com", id: "other-user" });

        usersRepository.findById.mockResolvedValue(user);
        usersRepository.findByEmail.mockResolvedValue(existingUser);

        const result = await sut.execute({
            userId: "user-123",
            email: "taken@example.com",
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(UserAlreadyExistsError);
        }
    });

    it("should return UserAlreadyExistsError when username is already taken", async () => {
        const user = makeUser();
        const existingUser = makeUser({ username: "takenusername", id: "other-user" });

        usersRepository.findById.mockResolvedValue(user);
        usersRepository.findByUsername.mockResolvedValue(existingUser);

        const result = await sut.execute({
            userId: "user-123",
            username: "takenusername",
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(UserAlreadyExistsError);
        }
    });

    it("should not check email uniqueness when email is unchanged", async () => {
        const user = makeUser({ email: "same@example.com" });
        usersRepository.findById.mockResolvedValue(user);
        usersRepository.update.mockImplementation(async (u) => u);

        await sut.execute({
            userId: "user-123",
            email: "same@example.com",
        });

        expect(usersRepository.findByEmail).not.toHaveBeenCalled();
    });

    it("should return UserNotFoundError when update fails", async () => {
        const user = makeUser();
        usersRepository.findById.mockResolvedValue(user);
        usersRepository.update.mockResolvedValue(null);

        const result = await sut.execute({
            userId: "user-123",
            email: "newemail@example.com",
        });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(UserNotFoundError);
        }
    });
});
