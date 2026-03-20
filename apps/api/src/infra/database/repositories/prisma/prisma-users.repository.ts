import { Injectable } from "@nestjs/common";

import { PrismaUserMapper } from "../../mappers/prisma/prisma-user.mapper";
import { PrismaService } from "../../prisma/prisma.service";

import { UsersRepository } from "@/domain/identity/application/repositories/users.repository";
import { User } from "@/domain/identity/enterprise/entities/user.entity";

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
    constructor(private prisma: PrismaService) {}

    async list(page: number, limit: number): Promise<User[]> {
        const users = await this.prisma.user.findMany({
            skip: (page - 1) * limit,
            take: limit,
        });

        return users.map(PrismaUserMapper.toDomain);
    }

    async findById(id: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) return null;

        return PrismaUserMapper.toDomain(user);
    }

    async findByUsername(username: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({
            where: { username },
        });

        if (!user) return null;

        return PrismaUserMapper.toDomain(user);
    }

    async findByEmail(email: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) return null;

        return PrismaUserMapper.toDomain(user);
    }

    async create(user: User): Promise<User> {
        const data = PrismaUserMapper.toPrisma(user);

        const created = await this.prisma.user.create({
            data,
        });

        return PrismaUserMapper.toDomain(created);
    }

    async update(user: User): Promise<User | null> {
        const existingUser = await this.prisma.user.findUnique({
            where: { id: user.id.toString() },
        });

        if (!existingUser) return null;

        const data = PrismaUserMapper.toPrisma(user);

        const updated = await this.prisma.user.update({
            where: { id: user.id.toString() },
            data,
        });

        return PrismaUserMapper.toDomain(updated);
    }

    async delete(userId: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) return null;

        await this.prisma.user.delete({
            where: { id: userId },
        });

        return PrismaUserMapper.toDomain(user);
    }
}
