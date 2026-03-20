### pipe

You must create a NestJS pipe following the existent pattern:

- Implement the `PipeTransform` interface from NestJS.
- Import `ArgumentMetadata`, `BadRequestException`, and `PipeTransform` from `@nestjs/common`.
- The `transform()` method receives the value and metadata about the argument.
- Check `metadata.type` to determine if the value is from `body`, `query`, `param`, etc.
- Throw `BadRequestException` with descriptive messages on validation failures.
- For Zod validation, catch `ZodError` and use `fromZodError` for user-friendly messages.
- Pipes can be used for validation, transformation, or both.

The USER must provide the validation or transformation logic required.

**Output file:** `src/http/@shared/pipes/[name].pipe.ts`

or for module-specific pipes:

**Output file:** `src/http/[module]/pipes/[name].pipe.ts`

#### Reference Files for pipe artifact

Read these files to understand the pattern:

- `src/http/@shared/pipes/zod-validation.pipe.ts`
