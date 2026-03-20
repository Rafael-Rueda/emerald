### error

You must create a domain error following the existent pattern:

- Create a class that extends the built-in `Error` class.
- Use PascalCase naming with the suffix `Error` (e.g., `UserNotFoundError`, `InvalidCredentialsError`).
- Set a descriptive error message in the `super()` call.
- Set `this.name` to the class name for proper error identification.
- Keep errors simple and focused on a single failure reason.
- Domain errors represent business rule failures, not technical errors.

The USER should provide the specific business rule failure that this error represents.

**Output file:** `src/domain/[bounded-context]/errors/[name].error.ts`

#### Reference Files for error artifact

Read these files to understand the pattern:

- `src/domain/identity/errors/user-not-found.error.ts`
- `src/domain/identity/errors/user-already-exists.error.ts`
- `src/domain/identity/errors/invalid-credentials.error.ts`
