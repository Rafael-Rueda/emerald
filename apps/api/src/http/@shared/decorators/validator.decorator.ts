import { applyDecorators, UsePipes } from "@nestjs/common";
import type { ZodType } from "zod";

import { ZodValidationPipe } from "../pipes/zod-validation.pipe";

export const Validator = (schema: ZodType, statusCode: 400 | 422 = 400) =>
    applyDecorators(UsePipes(new ZodValidationPipe(schema, statusCode)));
