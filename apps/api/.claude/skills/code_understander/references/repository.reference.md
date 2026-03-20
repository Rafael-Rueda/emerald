### repository

You must create a repository following the existent pattern:

**IMPORTANT:** A repository consists of TWO files:
1. **Domain Interface** (in the domain layer) - defines the contract
2. **Prisma Implementation** (in the infra layer) - implements the contract using Prisma

#### Domain Interface

- Create an interface (not a class) that defines the contract for data access.
- Import the entity type from the domain layer.
- Define methods for CRUD operations and any specific queries needed.
- Methods should return domain entities, not database models.
- Use `Promise` for all async operations.
- Use `null` as return type when an entity might not be found.

**Output file (interface):** `src/domain/[bounded-context]/application/repositories/[name].repository.ts`

#### Prisma Implementation

- Create a class that implements the domain repository interface.
- Use the `@Injectable()` decorator from NestJS.
- Inject `PrismaService` through the constructor.
- Use the corresponding mapper to convert between Prisma models and domain entities.
- Implement all methods defined in the interface.

**Output file (implementation):** `src/infra/database/repositories/prisma/prisma-[name].repository.ts`

#### Reference Files for repository artifact

Read these files to understand the pattern:

- `src/domain/identity/application/repositories/users.repository.ts`
- `src/infra/database/repositories/prisma/prisma-users.repository.ts`
- `src/infra/database/mappers/prisma/prisma-user.mapper.ts`
