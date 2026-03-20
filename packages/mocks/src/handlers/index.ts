import type { RequestHandler } from "msw";
import type { ScenarioConfig } from "../scenarios";
import { createPublicHandlers } from "./public-handlers";
import { createWorkspaceHandlers } from "./workspace-handlers";
import { createAiHandlers } from "./ai-handlers";

export { createPublicHandlers } from "./public-handlers";
export { createWorkspaceHandlers } from "./workspace-handlers";
export { createAiHandlers } from "./ai-handlers";
export { apiUrl, MSW_BASE_URL } from "./utils";

/**
 * Create all MSW handlers with the given scenario configuration.
 * Usable in both browser (setupWorker) and node (setupServer) contexts.
 */
export function createAllHandlers(
  config: ScenarioConfig = {},
): RequestHandler[] {
  return [
    ...createPublicHandlers(config),
    ...createWorkspaceHandlers(config),
    ...createAiHandlers(config),
  ];
}
