### mapper

You must create a Prisma mapper following the existent pattern:

- Create a class with static methods for converting between Prisma models and domain entities.
- Use the `toDomain()` method to convert a Prisma model to a domain entity.
- Use the `toPrisma()` method to convert a domain entity to a Prisma-compatible format.
- Import the domain entity and its value objects from the domain layer.
- Import the Prisma model type using `type` import from `@prisma/client`.
- Recreate value objects when converting to domain (using their static `create` methods).
- Pass the ID as the second argument to the entity's `create` method when converting to domain.
- Handle nullable fields appropriately (`null` to `undefined` and vice versa).

The USER must provide the entity being mapped and its corresponding Prisma model.

**Output file:** `src/infra/database/mappers/prisma/prisma-[name].mapper.ts`

#### Reference Files for mapper artifact

Read these files to understand the pattern:

- `src/infra/database/mappers/prisma/prisma-user.mapper.ts`
- `src/domain/identity/enterprise/entities/user.entity.ts`
