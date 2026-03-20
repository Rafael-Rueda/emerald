import { compare, hash } from "bcryptjs";

import { IHashComparerProvider, IHashProvider } from "@/domain/@shared/providers/bcrypt.provider";

export class BcryptHashProvider implements IHashProvider, IHashComparerProvider {
    private readonly SALT_ROUNDS = 6;

    async hash(plain: string): Promise<string> {
        return hash(plain, this.SALT_ROUNDS);
    }

    async compare(plain: string, hashed: string): Promise<boolean> {
        return compare(plain, hashed);
    }
}

export { compare, hash };
