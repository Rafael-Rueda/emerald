import { ROLES, User } from "../../../enterprise/entities/user.entity";
import { Username } from "../../../enterprise/value-objects/username.vo";
import { UserNotFoundError } from "../../../errors/user-not-found.error";
import { UsersRepository } from "../../repositories/users.repository";
import { GetUserByIdUseCase } from "../../use-cases/get-user-by-id.use-case";

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

describe("GetUserByIdUseCase", () => {
    let sut: GetUserByIdUseCase;
    let usersRepository: jest.Mocked<UsersRepository>;

    beforeEach(() => {
        usersRepository = makeUsersRepository();
        sut = new GetUserByIdUseCase(usersRepository);
    });

    it("should return a user when found by id", async () => {
        const user = makeUser({ id: "user-123" });
        usersRepository.findById.mockResolvedValue(user);

        const result = await sut.execute({ userId: "user-123" });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.user.id.toString()).toBe(user.id.toString());
            expect(result.value.user.email).toBe("test@example.com");
        }
        expect(usersRepository.findById).toHaveBeenCalledWith("user-123");
    });

    it("should return UserNotFoundError when user does not exist", async () => {
        usersRepository.findById.mockResolvedValue(null);

        const result = await sut.execute({ userId: "non-existent-id" });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(UserNotFoundError);
        }
    });

    it("should call repository with correct userId", async () => {
        usersRepository.findById.mockResolvedValue(null);

        await sut.execute({ userId: "specific-user-id" });

        expect(usersRepository.findById).toHaveBeenCalledWith("specific-user-id");
        expect(usersRepository.findById).toHaveBeenCalledTimes(1);
    });
});
