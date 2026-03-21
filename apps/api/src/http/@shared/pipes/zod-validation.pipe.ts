import {
    type ArgumentMetadata,
    BadRequestException,
    HttpStatus,
    type PipeTransform,
    UnprocessableEntityException,
} from "@nestjs/common";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export class ZodValidationPipe implements PipeTransform {
    constructor(
        private schema: ZodType,
        private validationStatusCode: HttpStatus.BAD_REQUEST | HttpStatus.UNPROCESSABLE_ENTITY = HttpStatus.BAD_REQUEST,
    ) {}

    transform(value: unknown, metadata: ArgumentMetadata) {
        if (metadata.type !== "body" && metadata.type !== "query") {
            return value;
        }

        try {
            return this.schema.parse(value);
        } catch (e) {
            const validationError = e instanceof ZodError ? fromZodError(e) : "Validation failed";

            if (this.validationStatusCode === HttpStatus.UNPROCESSABLE_ENTITY) {
                throw new UnprocessableEntityException(validationError);
            }

            if (e instanceof ZodError) {
                throw new BadRequestException(fromZodError(e));
            }

            throw new BadRequestException("Validation failed");
        }
    }
}
