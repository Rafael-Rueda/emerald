import { SetMetadata } from "@nestjs/common";

import { type Roles as RolesType } from "../enums/role.enum";

export const ROLES_KEY = "roles";
export const Roles = (...roles: RolesType[]) => SetMetadata(ROLES_KEY, roles);
