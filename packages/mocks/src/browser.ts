import { setupWorker } from "msw/browser";
import type { ScenarioConfig } from "./scenarios";
import { createAllHandlers } from "./handlers";

/**
 * Create a browser-side MSW worker with scenario-driven handlers.
 * Used by Storybook and optionally the live app in development mode.
 */
export function createMswWorker(config: ScenarioConfig = {}) {
  return setupWorker(...createAllHandlers(config));
}
