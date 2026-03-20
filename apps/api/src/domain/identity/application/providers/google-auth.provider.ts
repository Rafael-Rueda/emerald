export interface IGoogleUser {
    id: string;
    email: string;
    name: string;
}

export interface IGoogleAuthProvider {
    getRedirectUrl(): string;
    getUserFromCode(code: string): Promise<IGoogleUser>;
}
