### guard

You must create a NestJS guard following the existent pattern:

- Use the `@Injectable()` decorator from NestJS.
- Implement the `CanActivate` interface from NestJS.
- The `canActivate()` method receives an `ExecutionContext` and returns `boolean` or `Promise<boolean>`.
- Use `Reflector` to read metadata set by custom decorators.
- Use `context.switchToHttp().getRequest()` to access the HTTP request.
- Throw `UnauthorizedException` for authentication/authorization failures.
- Inject required services (e.g., `JwtService`, `ConfigService`) through the constructor.
- Check for public routes using metadata before enforcing authentication.
- Extract JWT tokens from the `Authorization` header (Bearer format).

The USER must provide the specific access control logic required.

**Output file:** `src/http/[module]/guards/[name].guard.ts`

or for shared guards:

**Output file:** `src/http/@shared/guards/[name].guard.ts`

#### Reference Files for guard artifact

Read these files to understand the pattern:

- `src/http/auth/guards/auth.guard.ts`
- `src/http/auth/decorators/public.decorator.ts`
- `src/http/auth/decorators/roles.decorator.ts`
