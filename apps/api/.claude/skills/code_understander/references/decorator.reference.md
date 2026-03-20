### decorator

You must create a NestJS decorator following the existent pattern:

There are different types of decorators:

#### Metadata Decorators (for Guards)

- Use `SetMetadata()` from NestJS to attach metadata to routes.
- Export a constant key for the metadata (e.g., `IS_PUBLIC_KEY`).
- Create a function that returns `SetMetadata(KEY, value)`.
- These decorators are typically read by guards using `Reflector`.

#### Combined Decorators

- Use `applyDecorators()` from NestJS to combine multiple decorators.
- Useful for applying multiple decorators with a single annotation.
- Can combine pipes, guards, and other decorators.

#### Parameter Decorators

- Use `createParamDecorator()` from NestJS.
- Access request context through `ExecutionContext`.
- Extract specific data from the request (e.g., current user).

The USER must provide the decorator type and its specific behavior.

**Output file:** `src/http/[module]/decorators/[name].decorator.ts`

or for shared decorators:

**Output file:** `src/http/@shared/decorators/[name].decorator.ts`

#### Reference Files for decorator artifact

Read these files to understand the pattern:

- `src/http/auth/decorators/public.decorator.ts`
- `src/http/auth/decorators/admin.decorator.ts`
- `src/http/auth/decorators/roles.decorator.ts`
- `src/http/@shared/decorators/validator.decorator.ts`
