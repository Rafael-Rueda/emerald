import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@prisma/client";
import type { Request } from "express";

import { ADMIN_KEY } from "../decorators/admin.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { Role, type Roles } from "../enums/role.enum";

import type { Env } from "@/env/env";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private reflector: Reflector,
        private configService: ConfigService<Env, true>,
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

        if (adminOnly && !user.roles?.includes(Role.ADMIN)) {
            throw new UnauthorizedException("You must be Admin");
        }

        if (requiredRoles && !requiredRoles.some((role) => user.roles?.includes(role))) {
            throw new UnauthorizedException("You do not have the proper role");
        }

        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(" ") ?? [];
        return type === "Bearer" ? token : undefined;
    }
}
