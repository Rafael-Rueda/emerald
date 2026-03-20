import { Roles } from "./roles.decorator";

import { Role } from "@/http/auth/enums/role.enum";

export const Author = () => Roles(Role.AUTHOR);
