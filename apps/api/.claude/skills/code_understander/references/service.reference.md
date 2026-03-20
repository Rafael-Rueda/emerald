### service

You must create an HTTP service following the existent pattern:

- Use the `@Injectable()` decorator from NestJS.
- Inject use cases, repositories, and providers through the constructor using `@Inject()` with string tokens.
- Orchestrate use case executions and handle the Either pattern results.
- Transform domain errors to appropriate HTTP exceptions (`BadRequestException`, `UnauthorizedException`, `NotFoundException`, etc.).
- Use presenters to transform domain entities to HTTP response DTOs.
- Handle JWT token generation if authentication is involved.
- Services bridge the HTTP layer with the domain layer.

The USER must provide the operations this service should handle.

**Output file:** `src/http/[module]/services/[name].service.ts`

#### Reference Files for service artifact

Read these files to understand the pattern:

- `src/http/auth/services/auth.service.ts`
- `src/http/users/services/users.service.ts`
- `src/http/@shared/presenters/user.presenter.ts`
