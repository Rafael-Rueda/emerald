# TSConfig Test Exclusions

Next.js apps in this monorepo must exclude test files (`**/*.test.ts`, `**/*.test.tsx`) from their `tsconfig.json` `include` arrays. 
This prevents Next.js from attempting to compile them and avoids typecheck errors related to leaking `vitest` and `jest-dom` global types into the app context.
