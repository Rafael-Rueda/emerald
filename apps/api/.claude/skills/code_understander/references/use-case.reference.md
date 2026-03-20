### use-case

You must create a use-case following the existent pattern:

- The use-case is a class that orchestrates domain logic without containing complex business rules itself.
- Use the Either pattern from `src/domain/@shared/either.ts` for error handling (Left for errors, Right for success).
- Create a request interface (`[Name]Request`) for the input parameters.
- Create an error type (`[Name]Error`) as a union of all possible domain errors the use-case can return.
- Create a response type (`[Name]Response`) as `Either<[Name]Error, { [result]: [Type] }>`.
- Inject dependencies (repositories, providers) through the constructor.
- The `execute` method must be async and return a `Promise<[Name]Response>`.
- Use `Left.call(new SomeError())` to return errors and `Right.call({ result })` for success.

**Output file:** `src/domain/[bounded-context]/application/use-cases/[name].use-case.ts`

#### Reference Files for use-case artifact

Read these files to understand the pattern:

- `src/domain/@shared/either.ts`
- `src/domain/identity/application/use-cases/create-user.use-case.ts`
- `src/domain/identity/application/use-cases/authenticate.use-case.ts`
