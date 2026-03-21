# TypeScript NodeNext ESM Resolution

When modifying shared packages in this monorepo (like `packages/contracts`), be aware that the `apps/api` NestJS app uses `module: nodenext` in its TypeScript configuration.

This requires all relative imports and re-exports in the shared packages to use explicit `.js` extensions at the end of the file path, even though the actual source files are `.ts`.

For example, in `packages/contracts/src/index.ts`:
```typescript
// BAD
export * from "./document";

// GOOD
export * from "./document.js";
```
Failure to do this will result in `ERR_MODULE_NOT_FOUND` when the API starts.
