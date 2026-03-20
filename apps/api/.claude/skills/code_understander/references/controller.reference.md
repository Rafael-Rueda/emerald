### controller

You must create a controller following the existent pattern:

#### Core Structure

- Use NestJS `@Controller()` decorator with the route prefix (e.g., `@Controller("/users")`).
- Inject the corresponding service through the constructor.
- Use HTTP method decorators (`@Get()`, `@Post()`, `@Put()`, `@Patch()`, `@Delete()`).
- Use the `@Validator()` decorator with the corresponding Zod schema for request validation.
- Use `@Body()` for request body parameters and `@Query()` for query parameters.
- Use `@Param()` for route parameters.
- Use custom decorators for access control (`@Public()`, `@Admin()`, `@Roles()`).
- Keep controllers thin - delegate business logic to services.
- Type request DTOs using the inferred types from Zod schemas (created with `createZodDto`).

#### API Documentation Decorators (Swagger/OpenAPI)

**Class-level decorators:**
- `@ApiTags("TagName")` - Groups endpoints under a tag in the docs.
- `@ApiBearerAuth("JWT-auth")` - Indicates endpoints require JWT authentication.

**Method-level decorators:**
- `@ApiOperation({ summary: "...", description: "..." })` - Describes the endpoint.
- `@ApiBody({ type: DTOClass })` - Documents request body schema.
- `@ApiQuery({ name: "...", required: boolean, type: Type, description: "..." })` - Documents query params.
- `@ApiParam({ name: "...", type: Type, description: "..." })` - Documents path params.
- `@ApiResponse({ status: number, description: "...", type?: DTOClass })` - Documents response.

**Common response status codes:**
- `200` - Success (GET, PATCH, DELETE)
- `201` - Created (POST)
- `400` - Validation error
- `401` - Unauthorized
- `404` - Not found
- `409` - Conflict (already exists)

#### Required Imports

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Validator } from "@/http/@shared/decorators/validator.decorator";
import { Public } from "@/http/auth/decorators/public.decorator";
```

The USER must provide the endpoints and their respective HTTP methods.

**Output file:** `src/http/[module]/controllers/[name].controller.ts`

#### Reference Files for controller artifact

Read these files to understand the pattern:

- `src/http/auth/controllers/auth.controller.ts`
- `src/http/users/controllers/users.controller.ts`
- `src/http/@shared/decorators/validator.decorator.ts`
- `src/http/users/schemas/users.schema.ts` (DTOs with createZodDto)
