import { type ArgumentMetadata, BadRequestException, type PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export class ZodValidationPipe implements PipeTransform {
    constructor(private schema: ZodType) {}
    transform(value: unknown, metadata: ArgumentMetadata) {
        if (metadata.type !== "body" && metadata.type !== "query") {
            return value;
        }

        try {
            return this.schema.parse(value);
        } catch (e) {
            if (e instanceof ZodError) {
                throw new BadRequestException(fromZodError(e));
            }
            throw new BadRequestException("Validation failed");
        }
    }
}
