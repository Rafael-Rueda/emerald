import { IPasswordAuthProvider } from "@/domain/identity/application/providers/password-auth.provider";
import { compare, hash } from "@/infra/cryptography/providers/bcrypt.provider";

export class PasswordAuthProvider implements IPasswordAuthProvider {
    private readonly SALT_ROUNDS = 6;

    async hash(password: string): Promise<string> {
        return hash(password, this.SALT_ROUNDS);
    }

    async compare(password: string, hashedPassword: string): Promise<boolean> {
        return compare(password, hashedPassword);
    }
}
