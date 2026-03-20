import { User } from "@/domain/identity/enterprise/entities/user.entity";

interface UserPresenterOptions {
    avatarUrl?: string | null;
}

export class UserPresenter {
    static toHTTP(user: User, options?: UserPresenterOptions) {
        return {
            id: user.id.toString(),
            username: user.username,
            email: user.email,
            roles: user.roles,
            avatarUrl: options?.avatarUrl ?? null,
        };
    }
}
