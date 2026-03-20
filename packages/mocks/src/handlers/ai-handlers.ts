import { http, HttpResponse } from "msw";
import type { ScenarioConfig } from "../scenarios";
import { resolveScenarios } from "../scenarios";
import { applyScenario } from "./utils";
import { buildAiContextResponse } from "../fixtures";

const API_BASE = "*/api/workspace";

/**
 * AI context MSW handlers.
 */
export function createAiHandlers(config: ScenarioConfig = {}) {
  const scenarios = resolveScenarios(config);

  return [
    // AI context: GET /api/workspace/ai-context/:entityType/:entityId
    http.get(
      `${API_BASE}/ai-context/:entityType/:entityId`,
      async ({ params }) => {
        const scenarioResponse = await applyScenario(scenarios.aiContext, {
          chunks: "not-an-array",
          entityId: 999,
        });
        if (scenarioResponse) return scenarioResponse;

        if (scenarios.aiContext === "not-found") {
          return HttpResponse.json(
            buildAiContextResponse(
              params.entityId as string,
              params.entityType as string,
              [],
            ),
          );
        }

        return HttpResponse.json(
          buildAiContextResponse(
            params.entityId as string,
            params.entityType as string,
          ),
        );
      },
    ),
  ];
}
