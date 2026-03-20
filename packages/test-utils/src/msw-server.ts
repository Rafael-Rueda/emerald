import { setupServer } from "msw/node";
import type { RequestHandler } from "msw";
import type { ScenarioConfig } from "@emerald/mocks";
import { createAllHandlers } from "@emerald/mocks";

/**
 * Create and manage an MSW server for Vitest.
 *
 * Usage in a test file:
 * ```ts
 * import { createTestServer } from "@emerald/test-utils";
 *
 * const server = createTestServer({ document: "success" });
 *
 * beforeAll(() => server.start());
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.stop());
 * ```
 */
export function createTestServer(config: ScenarioConfig = {}) {
  const handlers = createAllHandlers(config);
  const server = setupServer(...handlers);

  return {
    /** Start listening for requests. */
    start: () => server.listen({ onUnhandledRequest: "bypass" }),
    /** Reset handlers to the initial set. */
    resetHandlers: (...additionalHandlers: RequestHandler[]) =>
      server.resetHandlers(...additionalHandlers),
    /** Add runtime handlers (e.g., for one-off overrides in a single test). */
    use: (...overrides: RequestHandler[]) => server.use(...overrides),
    /** Stop the server and clean up. */
    stop: () => server.close(),
    /** Access the underlying MSW server for advanced usage. */
    raw: server,
  };
}
