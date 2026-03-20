import { ROLES, User } from "../../../enterprise/entities/user.entity";
import { Username } from "../../../enterprise/value-objects/username.vo";
import { UsersRepository } from "../../repositories/users.repository";
import { GetAllUsersUseCase } from "../../use-cases/get-all-users.use-case";

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

describe("GetAllUsersUseCase", () => {
    let sut: GetAllUsersUseCase;
    let usersRepository: jest.Mocked<UsersRepository>;

    beforeEach(() => {
        usersRepository = makeUsersRepository();
        sut = new GetAllUsersUseCase(usersRepository);
    });

    it("should return a list of users", async () => {
        const users = [
            makeUser({ username: "user1", email: "user1@example.com" }),
            makeUser({ username: "user2", email: "user2@example.com" }),
            makeUser({ username: "user3", email: "user3@example.com" }),
        ];
        usersRepository.list.mockResolvedValue(users);

        const result = await sut.execute({ page: 1, limit: 10 });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.users).toHaveLength(3);
            expect(result.value.users[0].email).toBe("user1@example.com");
            expect(result.value.users[1].email).toBe("user2@example.com");
            expect(result.value.users[2].email).toBe("user3@example.com");
        }
    });

    it("should return an empty list when no users exist", async () => {
        usersRepository.list.mockResolvedValue([]);

        const result = await sut.execute({ page: 1, limit: 10 });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.users).toHaveLength(0);
        }
    });

    it("should call repository with correct pagination parameters", async () => {
        usersRepository.list.mockResolvedValue([]);

        await sut.execute({ page: 2, limit: 20 });

        expect(usersRepository.list).toHaveBeenCalledWith(2, 20);
        expect(usersRepository.list).toHaveBeenCalledTimes(1);
    });

    it("should handle first page with default limit", async () => {
        usersRepository.list.mockResolvedValue([]);

        await sut.execute({ page: 1, limit: 10 });

        expect(usersRepository.list).toHaveBeenCalledWith(1, 10);
    });
});
