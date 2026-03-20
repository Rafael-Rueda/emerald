export interface IHashProvider {
    hash(plain: string): Promise<string>;
}

export interface IHashComparerProvider {
    compare(plain: string, hashed: string): Promise<boolean>;
}
