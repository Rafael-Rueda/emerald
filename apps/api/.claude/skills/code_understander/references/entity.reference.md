### entity

You must create an entity following the existent pattern:

- Extends `Entity` class, provided in `src/domain/@shared/entities/entity.entity.ts`.
- Always create the proper interface for the entity props, and create a getter and a setter for each of them, correctly typed, being typescript-friendly.
- Always must create a static `create` method, and a private `touch` method, the last one used in setters to update the updatedAt field.

The USER must provide you suffient details for the implementation of the entity. Give him options to choose before start implementing.

**Output file:** `src/domain/[bounded-context]/enterprise/entities/[name].entity.ts`

#### Reference Files for entity artifact

Read these files to understand the pattern:

- `src/domain/@shared/entities/entity.entity.ts`
- `src/domain/identity/enterprise/entities/user.entity.ts`
