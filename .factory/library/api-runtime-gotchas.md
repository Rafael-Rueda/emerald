# API Runtime Gotchas

- `pnpm --filter @emerald/api start:dev` and `pnpm --filter @emerald/api exec dotenv -e .env.test -- nest start` currently fail at runtime with:
  - `Error [ERR_MODULE_NOT_FOUND]: Cannot find module ... packages/contracts/src/document imported from packages/contracts/src/index.ts`
- Impact: local API process on `:3333` does not stay up, so manual `curl` verification must be replaced by Jest/supertest e2e checks until this is fixed.
