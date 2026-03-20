### provider

You must create a provider following the existent pattern:

**IMPORTANT:** A provider typically consists of TWO files:
1. **Domain Interface** (in the domain layer) - defines the contract
2. **Infrastructure Implementation** (in the infra layer) - implements the contract

#### Domain Interface

- Create an interface that defines the contract for external services/capabilities.
- Use the `I` prefix for interface names (e.g., `IHashProvider`, `IGoogleAuthProvider`).
- Define method signatures with proper TypeScript types.
- Use `Promise` for async operations.
- Keep interfaces focused on a single responsibility.

**Output file (interface):** `src/domain/@shared/providers/[name].provider.ts`

or for bounded-context specific providers:

**Output file (interface):** `src/domain/[bounded-context]/application/providers/[name].provider.ts`

#### Infrastructure Implementation

- Create a class that implements the domain provider interface.
- Use appropriate naming (e.g., `BcryptHashProvider` for bcrypt implementation of `IHashProvider`).
- Inject external libraries or configurations as needed.
- Handle async operations and error cases appropriately.
- The implementation should be injectable (can use `@Injectable()` if needed in NestJS context).

**Output file (implementation):** `src/infra/[category]/providers/[name].provider.ts`

#### Reference Files for provider artifact

Read these files to understand the pattern:

- `src/domain/@shared/providers/bcrypt.provider.ts`
- `src/infra/cryptography/providers/bcrypt.provider.ts`
- `src/domain/identity/application/providers/google-auth.provider.ts`
- `src/infra/auth/providers/google-auth.provider.ts`
