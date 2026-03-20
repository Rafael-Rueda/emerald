import { ValueObject } from "@/domain/@shared/value-objects/value-object.vo";

export const AUTH_METHOD_VARIATIONS = {
    PASSWORD: "PASSWORD",
    GOOGLE_OAUTH: "GOOGLE_OAUTH",
} as const;

export type AuthMethodVariationsType = (typeof AUTH_METHOD_VARIATIONS)[keyof typeof AUTH_METHOD_VARIATIONS];

interface AuthMethodProps {
    value: AuthMethodVariationsType;
}

export class AuthMethod extends ValueObject<AuthMethodProps> {
    private constructor(props: AuthMethodProps) {
        super(props);
    }

    get value(): AuthMethodVariationsType {
        return this.props.value;
    }

    static create(method: AuthMethodVariationsType): AuthMethod {
        return new AuthMethod({ value: method });
    }
}
