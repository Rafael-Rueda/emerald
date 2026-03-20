import { ROLES, Roles, User } from "../../enterprise/entities/user.entity";
import { Username } from "../../enterprise/value-objects/username.vo";
import { UserAlreadyExistsError } from "../../errors/user-already-exists.error";
import { UsersRepository } from "../repositories/users.repository";

import { Either, Left, Right } from "@/domain/@shared/either";
import { BcryptHashProvider } from "@/infra/cryptography/providers/bcrypt.provider";

interface CreateUserRequest {
    username: string;
    email: string;
    roles: Roles[];
    passwordHash?: string;
    admin?: boolean;
}

type CreateUserError = UserAlreadyExistsError;

type CreateUserResponse = Either<CreateUserError, { user: User }>;

export class CreateUserUseCase {
    constructor(
        private usersRepository: UsersRepository,
        private bcryptHashProvider: BcryptHashProvider,
    ) {}

    async execute(request: CreateUserRequest): Promise<CreateUserResponse> {
        const user = await this.usersRepository.findByEmail(request.email);
        const username = Username.create(request.username);

        const usernameAlreadyTaken = await this.usersRepository.findByUsername(username.toString());

        if (user || usernameAlreadyTaken) {
            return Left.call(new UserAlreadyExistsError());
        }

        const roles = request.roles.length
            ? request.roles
            : [request.admin ? ROLES.SUPER_ADMIN : ROLES.USER];

        const userToCreate = User.create({
            email: request.email,
            roles,
            username: username,
            ...(request.passwordHash ? { passwordHash: await this.bcryptHashProvider.hash(request.passwordHash) } : {}),
        });

        const createdUser = await this.usersRepository.create(userToCreate);

        return Right.call({
            user: createdUser,
        });
    }
}
