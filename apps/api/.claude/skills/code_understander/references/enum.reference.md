### enum

You must create an enum following the existent pattern:

There are two approaches for enums in this project:

#### Re-exporting Domain Enums

- If the enum already exists in the domain layer, re-export it for the HTTP layer.
- Use named exports to potentially rename or alias the enum.
- This keeps the HTTP layer decoupled from domain internals while reusing definitions.

#### Creating New HTTP Enums

- Define a new enum using TypeScript `enum` or `const` object with `as const`.
- Use PascalCase for enum names and SCREAMING_SNAKE_CASE for values.
- Export both the enum/const object and the type derived from it.

The USER must specify whether this is a re-export or a new enum definition.

**Output file:** `src/http/[module]/enums/[name].enum.ts`

#### Reference Files for enum artifact

Read these files to understand the pattern:

- `src/http/auth/enums/role.enum.ts`
- `src/http/auth/enums/auth-variations.enum.ts`
- `src/domain/identity/enterprise/entities/user.entity.ts` (for ROLES definition)
