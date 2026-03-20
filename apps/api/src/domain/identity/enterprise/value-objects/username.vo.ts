import { ValueObject } from "@/domain/@shared/value-objects/value-object.vo";

interface UsernameProps {
    value: string;
}

export class Username extends ValueObject<UsernameProps> {
    private static readonly MIN_LENGTH = 3;
    private static readonly MAX_LENGTH = 32;
    private static readonly VALID_PATTERN = /^[a-z0-9_]+$/;
    private static readonly RANDOM_SUFFIX_LENGTH = 5;

    private constructor(props: UsernameProps) {
        super(props);
    }

    get value(): string {
        return this.props.value;
    }

    private static slugify(input: string): string {
        return input
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "_") // Replace spaces with underscores
            .replace(/[^a-z0-9_]/g, "") // Remove invalid characters
            .replace(/_+/g, "_") // Replace multiple underscores with single
            .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
    }

    private static generateRandomSuffix(): string {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";

        for (let i = 0; i < Username.RANDOM_SUFFIX_LENGTH; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return result;
    }

    private static validate(username: string): string | null {
        if (username.length < Username.MIN_LENGTH) {
            return `Username must be at least ${Username.MIN_LENGTH} characters`;
        }

        if (username.length > Username.MAX_LENGTH) {
            return `Username must be at most ${Username.MAX_LENGTH} characters`;
        }

        if (!Username.VALID_PATTERN.test(username)) {
            return "Username can only contain lowercase letters, numbers, and underscores";
        }

        return null;
    }

    static create(username: string): Username {
        const slugified = Username.slugify(username);
        const error = Username.validate(slugified);

        if (error) {
            throw new Error(error);
        }

        return new Username({ value: slugified });
    }

    static generateUniqueFrom(input: string): Username {
        const slug = Username.slugify(input);
        const suffix = Username.generateRandomSuffix();
        const uniqueUsername = `${slug}_${suffix}`;

        const error = Username.validate(uniqueUsername);

        if (error) {
            throw new Error(error);
        }

        return new Username({ value: uniqueUsername });
    }

    toString() {
        return this.value.toString();
    }
}
