### value-object

You must create an value-object following the existent pattern:

- Extends `ValueObject` class, provided in `src/domain/@shared/value-objects/value-object.vo.ts`.
- Always create the proper interface for the value-object props (only value), and create the getter for the value prop.
- Always must create a static `create` method, with proper value validation, following the business rule of the respective value-object.

**Output file:** `src/domain/[bounded-context]/enterprise/value-objects/[name].vo.ts`

#### Reference files to understand the pattern:

Read these files to understand the pattern:

- `src/domain/@shared/value-objects/value-object.vo.ts`
- `src/domain/identity/enterprise/value-objects/username.vo.ts`
- `src/domain/identity/enterprise/value-objects/auth-method.vo.ts`
