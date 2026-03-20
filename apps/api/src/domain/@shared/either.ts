// Error
export class Left<L, R> {
    readonly value: L;

    private constructor(value: L) {
        this.value = value;
    }

    public isRight(): this is Right<L, R> {
        return false;
    }

    public isLeft(): this is Left<L, R> {
        return true;
    }

    public static call<L, R>(value: L): Either<L, R> {
        return new Left(value);
    }
}

// Success
export class Right<L, R> {
    readonly value: R;

    private constructor(value: R) {
        this.value = value;
    }

    public isRight(): this is Right<L, R> {
        return true;
    }

    public isLeft(): this is Left<L, R> {
        return false;
    }

    public static call<L, R>(value: R): Either<L, R> {
        return new Right(value);
    }
}

export type Either<L, R> = Left<L, R> | Right<L, R>;
