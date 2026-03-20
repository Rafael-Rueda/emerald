import type { User as PrismaUser } from "@prisma/client";

import { Roles, User } from "@/domain/identity/enterprise/entities/user.entity";
import { Username } from "@/domain/identity/enterprise/value-objects/username.vo";

export class PrismaUserMapper {
    static toDomain(raw: PrismaUser): User {
        return User.create(
            {
                username: Username.create(raw.username),
                email: raw.email,
                passwordHash: raw.passwordHash ?? undefined,
                roles: raw.roles as Roles[],
            },
            raw.id,
        );
    }

    static toPrisma(user: User) {
        return {
            id: user.id.toString(),
            username: user.username,
            email: user.email,
            passwordHash: user.passwordHash ?? null,
            roles: user.roles,
        };
    }
}
