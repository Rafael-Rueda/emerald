import { HttpResponse, delay } from "msw";
import type { Scenario } from "../scenarios";

/**
 * Shared handler utilities for scenario-driven responses.
 */

/**
 * Default base URL for MSW handlers.
 * In browser contexts (Storybook, live app), handlers use relative paths
 * which resolve against the current origin. In Node.js (Vitest, Playwright),
 * MSW requires absolute URLs. This base URL is used as the default origin.
 */
export const MSW_BASE_URL = "http://localhost";

/**
 * Build an absolute URL for MSW handler matching.
 * MSW v2 requires absolute URLs in Node.js (setupServer) contexts.
 * In browser contexts, relative paths resolve automatically, but absolute
 * URLs also work, so we always use absolute for cross-context compatibility.
 */
export function apiUrl(path: string): string {
  return new URL(path, MSW_BASE_URL).href;
}

/**
 * Apply scenario behavior (loading delay, error response) before
 * the handler returns its success or not-found logic.
 *
 * Returns an HttpResponse for error/loading/malformed,
 * or null if the handler should continue with success/not-found logic.
 */
export async function applyScenario(
  scenario: Scenario,
  malformedPayload: Record<string, unknown> = { __broken: true },
): Promise<HttpResponse<null> | HttpResponse<Record<string, unknown>> | null> {
  if (scenario === "loading") {
    // Infinite delay - the request never resolves
    await delay("infinite");
    return HttpResponse.json(null, { status: 408 });
  }

  if (scenario === "error") {
    return HttpResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }

  if (scenario === "malformed") {
    // Return a 200 with data that does not match the expected schema
    return HttpResponse.json(malformedPayload, { status: 200 });
  }

  // success or not-found: handled by the caller
  return null;
}
