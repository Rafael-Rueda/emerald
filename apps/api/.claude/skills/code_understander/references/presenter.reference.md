### presenter

You must create a presenter following the existent pattern:

- Create a class with static methods for transforming domain entities to HTTP DTOs.
- Use the `toHTTP()` method name for converting a domain entity to an HTTP response format.
- Import the domain entity type from the domain layer.
- Filter out sensitive data (e.g., password hashes) that should not be exposed to clients.
- Convert domain value objects to their primitive representations.
- Convert unique entity IDs to strings using `.toString()`.
- Keep presenters focused on a single entity type.

The USER must provide the entity and the fields to expose in the HTTP response.

**Output file:** `src/http/@shared/presenters/[name].presenter.ts`

or for module-specific presenters:

**Output file:** `src/http/[module]/presenters/[name].presenter.ts`

#### Reference Files for presenter artifact

Read these files to understand the pattern:

- `src/http/@shared/presenters/user.presenter.ts`
