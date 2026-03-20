import { Module } from "@nestjs/common";

import { PrismaModule } from "./prisma.module";

import { UsersRepository } from "@/domain/identity/application/repositories/users.repository";
import { CreateUserUseCase } from "@/domain/identity/application/use-cases/create-user.use-case";
import { DeleteUserUseCase } from "@/domain/identity/application/use-cases/delete-user.use-case";
import { GetAllUsersUseCase } from "@/domain/identity/application/use-cases/get-all-users.use-case";
import { GetUserByIdUseCase } from "@/domain/identity/application/use-cases/get-user-by-id.use-case";
import { UpdateUserUseCase } from "@/domain/identity/application/use-cases/update-user.use-case";
import { BcryptHashProvider } from "@/infra/cryptography/providers/bcrypt.provider";
import { PrismaUsersRepository } from "@/infra/database/repositories/prisma/prisma-users.repository";

@Module({
    imports: [PrismaModule],
    providers: [
        // Providers
        {
            provide: "BcryptHashProvider",
            useClass: BcryptHashProvider,
        },

        // Repositories
        {
            provide: "UsersRepository",
            useClass: PrismaUsersRepository,
        },

        // Use-Cases
        {
            provide: "CreateUserUseCase",
            inject: ["UsersRepository", "BcryptHashProvider"],
            useFactory: (usersRepository: UsersRepository, bcryptHashProvider: BcryptHashProvider) =>
                new CreateUserUseCase(usersRepository, bcryptHashProvider),
        },
        {
            provide: "UpdateUserUseCase",
            inject: ["UsersRepository", "BcryptHashProvider"],
            useFactory: (usersRepository: UsersRepository, bcryptHashProvider: BcryptHashProvider) =>
                new UpdateUserUseCase(usersRepository, bcryptHashProvider),
        },
        {
            provide: "DeleteUserUseCase",
            inject: ["UsersRepository"],
            useFactory: (usersRepository: UsersRepository) => new DeleteUserUseCase(usersRepository),
        },
        {
            provide: "GetAllUsersUseCase",
            inject: ["UsersRepository"],
            useFactory: (usersRepository: UsersRepository) => new GetAllUsersUseCase(usersRepository),
        },
        {
            provide: "GetUserUseCase",
            inject: ["UsersRepository"],
            useFactory: (usersRepository: UsersRepository) => new GetUserByIdUseCase(usersRepository),
        },
    ],
    exports: [
        "UsersRepository",
        "CreateUserUseCase",
        "UpdateUserUseCase",
        "DeleteUserUseCase",
        "GetAllUsersUseCase",
        "GetUserUseCase",
    ],
})
export class IdentityModule {}
