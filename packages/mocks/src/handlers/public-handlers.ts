import { http, HttpResponse } from "msw";
import type { ScenarioConfig } from "../scenarios";
import { resolveScenarios } from "../scenarios";
import { applyScenario } from "./utils";
import {
  findDocument,
  buildDocumentResponse,
  findNavigationTree,
  buildNavigationResponse,
  buildVersionListResponse,
  buildSearchResponse,
  defaultSearchResults,
} from "../fixtures";

const API_BASE = "*/api";

/**
 * Public-surface MSW handlers for document, navigation, version, and search.
 */
export function createPublicHandlers(config: ScenarioConfig = {}) {
  const scenarios = resolveScenarios(config);

  return [
    // Document resolution: GET /api/docs/:space/:version/:slug
    http.get(`${API_BASE}/docs/:space/:version/:slug`, async ({ params }) => {
      const scenarioResponse = await applyScenario(scenarios.document, {
        document: { id: 123, title: null },
      });
      if (scenarioResponse) return scenarioResponse;

      if (scenarios.document === "not-found") {
        return HttpResponse.json(
          { error: "Document not found" },
          { status: 404 },
        );
      }

      const doc = findDocument(
        params.space as string,
        params.version as string,
        params.slug as string,
      );

      if (!doc) {
        return HttpResponse.json(
          { error: "Document not found" },
          { status: 404 },
        );
      }

      return HttpResponse.json(buildDocumentResponse(doc));
    }),

    // Navigation tree: GET /api/navigation/:space/:version
    http.get(`${API_BASE}/navigation/:space/:version`, async ({ params }) => {
      const scenarioResponse = await applyScenario(scenarios.navigation, {
        navigation: "broken",
      });
      if (scenarioResponse) return scenarioResponse;

      if (scenarios.navigation === "not-found") {
        return HttpResponse.json(
          { error: "Navigation not found" },
          { status: 404 },
        );
      }

      const tree = findNavigationTree(
        params.space as string,
        params.version as string,
      );

      if (!tree) {
        return HttpResponse.json(
          { error: "Navigation not found" },
          { status: 404 },
        );
      }

      return HttpResponse.json(buildNavigationResponse(tree));
    }),

    // Version list: GET /api/versions/:space
    http.get(`${API_BASE}/versions/:space`, async ({ params }) => {
      const scenarioResponse = await applyScenario(scenarios.versions, {
        versions: [{ broken: true }],
      });
      if (scenarioResponse) return scenarioResponse;

      if (scenarios.versions === "not-found") {
        return HttpResponse.json(
          { error: "Versions not found" },
          { status: 404 },
        );
      }

      const versionList = buildVersionListResponse(params.space as string);

      if (!versionList) {
        return HttpResponse.json(
          { error: "Versions not found" },
          { status: 404 },
        );
      }

      return HttpResponse.json(versionList);
    }),

    // Search: GET /api/search?q=:query
    http.get(`${API_BASE}/search`, async ({ request }) => {
      const scenarioResponse = await applyScenario(scenarios.search, {
        results: "not-an-array",
      });
      if (scenarioResponse) return scenarioResponse;

      const url = new URL(request.url);
      const query = url.searchParams.get("q") || "";

      if (scenarios.search === "not-found") {
        return HttpResponse.json(buildSearchResponse(query, []));
      }

      // Filter results by query (case-insensitive substring match)
      const filtered = query
        ? defaultSearchResults.filter(
            (r) =>
              r.title.toLowerCase().includes(query.toLowerCase()) ||
              r.snippet.toLowerCase().includes(query.toLowerCase()),
          )
        : defaultSearchResults;

      return HttpResponse.json(buildSearchResponse(query, filtered));
    }),
  ];
}
