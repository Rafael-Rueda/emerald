### schema

You must create a Zod validation schema following the existent pattern:

#### Core Structure

- Import `createZodDto` from `nestjs-zod` and `z` from `zod`.
- Create a schema using `z.object()` for request validation.
- Use appropriate Zod validators for each field (`z.string()`, `z.email()`, `z.number()`, `z.uuid()`, etc.).
- Add constraints using methods like `.min()`, `.max()`, `.optional()`, `.nullable()`, `.default()`.
- Use `.refine()` for custom validation logic.
- Export the schema with a descriptive name ending in `Schema` (e.g., `createUserBodySchema`).

#### DTO Classes (for OpenAPI documentation)

- Create DTO classes using `createZodDto(schema)` instead of `z.infer<typeof schema>`.
- Name the DTO class ending with `DTO` (e.g., `CreateUserDTO`).
- This generates classes compatible with Swagger/OpenAPI decorators.

#### Field Descriptions (for API docs)

- Use `.describe("...")` on each field to document it in the OpenAPI spec.
- Example: `z.string().min(3).describe("Username (3-24 characters)")`

#### Schema Types

- **Body schemas**: For request bodies (POST, PATCH, PUT)
- **Query schemas**: For query parameters (use `z.coerce.number()` for numeric params)
- **Param schemas**: For path parameters (e.g., `:id`)
- **Response schemas**: Based on Presenter output, for documenting responses

#### Required Imports

```typescript
import { createZodDto } from "nestjs-zod";
import z from "zod";
```

#### Example Pattern

```typescript
// Schema definition
export const createUserBodySchema = z.object({
    username: z.string().min(3).max(24).describe("Username (3-24 characters)"),
    email: z.email().describe("User email address"),
    password: z.string().min(8).describe("Password (minimum 8 characters)"),
});

// DTO class for OpenAPI
export class CreateUserDTO extends createZodDto(createUserBodySchema) {}

// Response schema (based on Presenter)
export const userResponseSchema = z.object({
    id: z.uuid().describe("User unique identifier"),
    username: z.string().describe("Username"),
    email: z.email().describe("User email address"),
    roles: z.array(z.enum(["USER", "ADMIN"])).describe("User roles"),
});

export class UserResponseDTO extends createZodDto(userResponseSchema) {}
```

The USER must provide the fields and their validation rules.

**Output file:** `src/http/[module]/schemas/[name].schema.ts`

#### Reference Files for schema artifact

Read these files to understand the pattern:

- `src/http/auth/schemas/auth.schema.ts`
- `src/http/users/schemas/users.schema.ts`
