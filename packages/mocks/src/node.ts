import { setupServer } from "msw/node";
import type { ScenarioConfig } from "./scenarios";
import { createAllHandlers } from "./handlers";

/**
 * Create a Node-side MSW server with scenario-driven handlers.
 * Used by Vitest and Playwright.
 */
export function createMswServer(config: ScenarioConfig = {}) {
  return setupServer(...createAllHandlers(config));
}
