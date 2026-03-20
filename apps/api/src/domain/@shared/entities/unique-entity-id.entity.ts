import { randomUUID } from "node:crypto";

export class UniqueEntityId {
    private value: string;

    toString() {
        return this.value;
    }

    toValue() {
        return this.value;
    }

    static create(value?: string) {
        return new UniqueEntityId(value);
    }

    public constructor(value?: string) {
        this.value = value ?? randomUUID();
    }

    public equals(id: UniqueEntityId) {
        return id.toValue() === this.value;
    }
}
