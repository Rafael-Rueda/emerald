import { User } from "../../enterprise/entities/user.entity";

export interface UsersRepository {
    list(page: number, limit: number): Promise<User[]>;
    findById(id: string): Promise<User | null>;
    findByUsername(username: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;

    create(user: User): Promise<User>;

    update(user: User): Promise<User | null>;

    delete(userId: string): Promise<User | null>;
}
