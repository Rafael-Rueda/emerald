import { User } from "../../enterprise/entities/user.entity";
import { UserNotFoundError } from "../../errors/user-not-found.error";
import { UsersRepository } from "../repositories/users.repository";

import { Either, Left, Right } from "@/domain/@shared/either";

interface GetUserByIdRequest {
    userId: string;
}

type GetUserByIdError = UserNotFoundError;

type GetUserByIdResponse = Either<GetUserByIdError, { user: User }>;

export class GetUserByIdUseCase {
    constructor(private usersRepository: UsersRepository) {}

    async execute(request: GetUserByIdRequest): Promise<GetUserByIdResponse> {
        const { userId } = request;

        const user = await this.usersRepository.findById(userId);

        if (!user) {
            return Left.call(new UserNotFoundError());
        }

        return Right.call({ user });
    }
}
