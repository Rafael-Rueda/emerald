import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@prisma/client";
import type { Request } from "express";

import { ADMIN_KEY } from "../decorators/admin.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { Role, type Roles } from "../enums/role.enum";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        const adminOnly = this.reflector.getAllAndOverride<boolean>(ADMIN_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        const requiredRoles = this.reflector.getAllAndOverride<Roles[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest();

        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException("Missing JWT Token");
        }

        let user: User;

        try {
            const payload = await this.jwtService.verifyAsync(token);

            request["user"] = payload;
            user = payload;
        } catch {
            throw new UnauthorizedException("Invalid JWT Token");
        }

        if (adminOnly && !this.hasRequiredRole(user, Role.SUPER_ADMIN)) {
            throw new ForbiddenException("You must be Super Admin");
        }

        if (requiredRoles && !requiredRoles.some((role) => this.hasRequiredRole(user, role))) {
            throw new ForbiddenException("You do not have the proper role");
        }

        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(" ") ?? [];
        return type === "Bearer" ? token : undefined;
    }

    private hasRequiredRole(user: User, requiredRole: Roles): boolean {
        if (!user.roles?.length) {
            return false;
        }

        const roleAliases: Record<Roles, Roles[]> = {
            [Role.SUPER_ADMIN]: [Role.SUPER_ADMIN, Role.ADMIN],
            [Role.ADMIN]: [Role.ADMIN, Role.SUPER_ADMIN],
            [Role.AUTHOR]: [Role.AUTHOR, Role.USER, Role.ADMIN, Role.SUPER_ADMIN],
            [Role.USER]: [Role.USER, Role.AUTHOR, Role.ADMIN, Role.SUPER_ADMIN],
            [Role.VIEWER]: [Role.VIEWER, Role.AUTHOR, Role.USER, Role.ADMIN, Role.SUPER_ADMIN],
        };

        return roleAliases[requiredRole].some((role) => user.roles.includes(role));
    }
}
