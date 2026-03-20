import { User } from "../../enterprise/entities/user.entity";
import { UserNotFoundError } from "../../errors/user-not-found.error";
import { UsersRepository } from "../repositories/users.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { DomainEvents } from "@/domain/@shared/events/domain-events";

interface DeleteUserRequest {
    userId: string;
}

type DeleteUserError = UserNotFoundError;

type DeleteUserResponse = Either<DeleteUserError, { user: User }>;

export class DeleteUserUseCase {
    constructor(private usersRepository: UsersRepository) {}

    async execute(request: DeleteUserRequest): Promise<DeleteUserResponse> {
        const { userId } = request;

        const user = await this.usersRepository.findById(userId);

        if (!user) {
            return Left.call(new UserNotFoundError());
        }

        // Mark user for deletion and emit UserDeletedEvent
        user.delete();

        // Dispatch domain events before delete (cascade file deletion)
        DomainEvents.dispatchEventsForAggregate(user.id);

        // Delete user from repository
        await this.usersRepository.delete(userId);

        return Right.call({ user });
    }
}
