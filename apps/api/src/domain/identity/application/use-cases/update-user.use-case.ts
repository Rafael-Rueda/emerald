import { Roles, User } from "../../enterprise/entities/user.entity";
import { Username } from "../../enterprise/value-objects/username.vo";
import { UserAlreadyExistsError } from "../../errors/user-already-exists.error";
import { UserNotFoundError } from "../../errors/user-not-found.error";
import { UsersRepository } from "../repositories/users.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { BcryptHashProvider } from "@/infra/cryptography/providers/bcrypt.provider";

interface UpdateUserRequest {
    userId: string;
    username?: string;
    email?: string;
    roles?: Roles[];
    password?: string;
}

type UpdateUserError = UserNotFoundError | UserAlreadyExistsError;

type UpdateUserResponse = Either<UpdateUserError, { user: User }>;

export class UpdateUserUseCase {
    constructor(
        private usersRepository: UsersRepository,
        private bcryptHashProvider: BcryptHashProvider,
    ) {}

    async execute(request: UpdateUserRequest): Promise<UpdateUserResponse> {
        const { userId, username, email, roles, password } = request;

        const user = await this.usersRepository.findById(userId);

        if (!user) {
            return Left.call(new UserNotFoundError());
        }

        if (email && email !== user.email) {
            const emailAlreadyTaken = await this.usersRepository.findByEmail(email);

            if (emailAlreadyTaken) {
                return Left.call(new UserAlreadyExistsError());
            }

            user.email = email;
        }

        if (username && username !== user.username) {
            const newUsername = Username.create(username);
            const usernameAlreadyTaken = await this.usersRepository.findByUsername(newUsername.toString());

            if (usernameAlreadyTaken) {
                return Left.call(new UserAlreadyExistsError());
            }

            user.username = newUsername.toString();
        }

        if (roles) {
            user.roles = roles;
        }

        if (password) {
            user.passwordHash = await this.bcryptHashProvider.hash(password);
        }

        const updatedUser = await this.usersRepository.update(user);

        if (!updatedUser) {
            return Left.call(new UserNotFoundError());
        }

        return Right.call({ user: updatedUser });
    }
}
