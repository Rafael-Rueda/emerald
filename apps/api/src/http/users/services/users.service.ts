import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { CreateUserUseCase } from "@/domain/identity/application/use-cases/create-user.use-case";
import { DeleteUserUseCase } from "@/domain/identity/application/use-cases/delete-user.use-case";
import { GetAllUsersUseCase } from "@/domain/identity/application/use-cases/get-all-users.use-case";
import { GetUserByIdUseCase } from "@/domain/identity/application/use-cases/get-user-by-id.use-case";
import { UpdateUserUseCase } from "@/domain/identity/application/use-cases/update-user.use-case";
import { ROLES, Roles, User } from "@/domain/identity/enterprise/entities/user.entity";
import { DeleteFileByEntityUseCase } from "@/domain/storage/application/use-cases/delete-file-by-entity.use-case";
import { GetFileUrlUseCase } from "@/domain/storage/application/use-cases/get-file-url.use-case";
import { UploadFileUseCase } from "@/domain/storage/application/use-cases/upload-file.use-case";
import { UserPresenter } from "@/http/@shared/presenters/user.presenter";
import { CreateUserDTO, ListUsersQueryDTO, UpdateUserDTO } from "@/http/users/schemas/users.schema";

@Injectable()
export class UsersService {
    constructor(
        @Inject("CreateUserUseCase")
        private createUserUseCase: CreateUserUseCase,
        @Inject("GetUserUseCase")
        private getUserByIdUseCase: GetUserByIdUseCase,
        @Inject("GetAllUsersUseCase")
        private getAllUsersUseCase: GetAllUsersUseCase,
        @Inject("UpdateUserUseCase")
        private updateUserUseCase: UpdateUserUseCase,
        @Inject("DeleteUserUseCase")
        private deleteUserUseCase: DeleteUserUseCase,
        @Inject("GetFileUrlUseCase")
        private getFileUrlUseCase: GetFileUrlUseCase,
        @Inject("UploadFileUseCase")
        private uploadFileUseCase: UploadFileUseCase,
        @Inject("DeleteFileByEntityUseCase")
        private deleteFileByEntityUseCase: DeleteFileByEntityUseCase,
    ) {}

    private async getUserAvatarUrl(userId: string): Promise<string | null> {
        const result = await this.getFileUrlUseCase.execute({
            entityType: "user",
            entityId: userId,
            field: "avatar",
        });

        if (result.isLeft()) {
            return null;
        }

        return result.value.url;
    }

    private async presentUser(user: User) {
        const avatarUrl = await this.getUserAvatarUrl(user.id.toString());
        return UserPresenter.toHTTP(user, { avatarUrl });
    }

    private async presentUsers(users: User[]) {
        return Promise.all(users.map((user) => this.presentUser(user)));
    }

    async create(dto: CreateUserDTO) {
        const result = await this.createUserUseCase.execute({
            username: dto.username,
            email: dto.email,
            passwordHash: dto.password,
            roles: [ROLES.USER],
        });

        if (result.isLeft()) {
            const error = result.value;
            if (error.name === "UserAlreadyExistsError") {
                throw new ConflictException(error.message);
            }
            throw new BadRequestException(error.message);
        }

        return {
            user: await this.presentUser(result.value.user),
        };
    }

    async findAll(query: ListUsersQueryDTO) {
        const result = await this.getAllUsersUseCase.execute({
            page: query.page,
            limit: query.limit,
        });

        const users = result.value.users;

        return {
            users: await this.presentUsers(users),
            page: query.page,
            limit: query.limit,
        };
    }

    async findOne(userId: string) {
        const result = await this.getUserByIdUseCase.execute({ userId });

        if (result.isLeft()) {
            const error = result.value;
            if (error.name === "UserNotFoundError") {
                throw new NotFoundException(error.message);
            }
            throw new BadRequestException(error.message);
        }

        return {
            user: await this.presentUser(result.value.user),
        };
    }

    async update(
        userId: string,
        dto: UpdateUserDTO,
        options?: {
            avatar?: Express.Multer.File;
            deleteAvatar?: boolean;
            environment?: string;
        },
    ) {
        const result = await this.updateUserUseCase.execute({
            userId,
            username: dto.username,
            email: dto.email,
            password: dto.password,
            roles: dto.roles as Roles[] | undefined,
        });

        if (result.isLeft()) {
            const error = result.value;
            if (error.name === "UserNotFoundError") {
                throw new NotFoundException(error.message);
            }
            if (error.name === "UserAlreadyExistsError") {
                throw new ConflictException(error.message);
            }
            throw new BadRequestException(error.message);
        }

        // Delete avatar if explicitly requested
        if (options?.deleteAvatar) {
            await this.deleteFileByEntityUseCase.execute({
                entityType: "user",
                entityId: userId,
                field: "avatar",
            });
        }
        // Upload avatar if provided
        else if (options?.avatar && options?.environment) {
            const uploadResult = await this.uploadFileUseCase.execute({
                entityType: "user",
                entityId: userId,
                field: "avatar",
                filename: options.avatar.originalname,
                buffer: options.avatar.buffer,
                environment: options.environment,
                validationOptions: {
                    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
                    maxSizeBytes: 5 * 1024 * 1024, // 5MB
                },
                optimizeImage: {
                    width: 400,
                    height: 400,
                    fit: "cover",
                    quality: 80,
                    format: "webp",
                },
            });

            if (uploadResult.isLeft()) {
                throw new BadRequestException(uploadResult.value.message);
            }
        }

        return {
            user: await this.presentUser(result.value.user),
        };
    }

    async remove(userId: string) {
        const result = await this.deleteUserUseCase.execute({ userId });

        if (result.isLeft()) {
            const error = result.value;
            if (error.name === "UserNotFoundError") {
                throw new NotFoundException(error.message);
            }
            throw new BadRequestException(error.message);
        }

        return {
            user: await this.presentUser(result.value.user),
        };
    }
}
