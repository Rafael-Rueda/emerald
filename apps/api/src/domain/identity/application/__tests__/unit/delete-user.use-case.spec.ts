import { ROLES, User } from "../../../enterprise/entities/user.entity";
import { Username } from "../../../enterprise/value-objects/username.vo";
import { UserNotFoundError } from "../../../errors/user-not-found.error";
import { UsersRepository } from "../../repositories/users.repository";
import { DeleteUserUseCase } from "../../use-cases/delete-user.use-case";

import { DomainEvents } from "@/domain/@shared/events/domain-events";

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

describe("DeleteUserUseCase", () => {
    let sut: DeleteUserUseCase;
    let usersRepository: jest.Mocked<UsersRepository>;

    beforeEach(() => {
        usersRepository = makeUsersRepository();
        sut = new DeleteUserUseCase(usersRepository);
        // Clear domain events between tests
        DomainEvents.clearHandlers();
        DomainEvents.clearMarkedAggregates();
    });

    it("should delete a user successfully", async () => {
        const user = makeUser({ id: "user-to-delete" });
        usersRepository.findById.mockResolvedValue(user);
        usersRepository.delete.mockResolvedValue(user);

        const result = await sut.execute({ userId: "user-to-delete" });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.user.id.toString()).toBe(user.id.toString());
        }
        expect(usersRepository.findById).toHaveBeenCalledWith("user-to-delete");
        expect(usersRepository.delete).toHaveBeenCalledWith("user-to-delete");
    });

    it("should return UserNotFoundError when user does not exist", async () => {
        usersRepository.findById.mockResolvedValue(null);

        const result = await sut.execute({ userId: "non-existent-id" });

        expect(result.isLeft()).toBe(true);
        if (result.isLeft()) {
            expect(result.value).toBeInstanceOf(UserNotFoundError);
        }
        expect(usersRepository.delete).not.toHaveBeenCalled();
    });

    it("should call repository delete with correct userId", async () => {
        const user = makeUser({ id: "specific-user-id" });
        usersRepository.findById.mockResolvedValue(user);
        usersRepository.delete.mockResolvedValue(user);

        await sut.execute({ userId: "specific-user-id" });

        expect(usersRepository.findById).toHaveBeenCalledWith("specific-user-id");
        expect(usersRepository.delete).toHaveBeenCalledWith("specific-user-id");
        expect(usersRepository.delete).toHaveBeenCalledTimes(1);
    });

    it("should return the deleted user data", async () => {
        const user = makeUser({
            username: "deleteduser",
            email: "deleted@example.com",
            id: "deleted-123",
        });
        usersRepository.findById.mockResolvedValue(user);
        usersRepository.delete.mockResolvedValue(user);

        const result = await sut.execute({ userId: "deleted-123" });

        expect(result.isRight()).toBe(true);
        if (result.isRight()) {
            expect(result.value.user.username).toBe("deleteduser");
            expect(result.value.user.email).toBe("deleted@example.com");
        }
    });

    it("should dispatch UserDeletedEvent when user is deleted", async () => {
        const user = makeUser({ id: "event-user-id" });
        usersRepository.findById.mockResolvedValue(user);
        usersRepository.delete.mockResolvedValue(user);

        const eventHandler = jest.fn();
        DomainEvents.register(eventHandler, "UserDeletedEvent");

        await sut.execute({ userId: "event-user-id" });

        expect(eventHandler).toHaveBeenCalledTimes(1);
        expect(eventHandler).toHaveBeenCalledWith(
            expect.objectContaining({
                ocurredAt: expect.any(Date),
            }),
        );
    });
});
