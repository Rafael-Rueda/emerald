import { http, HttpResponse } from "msw";
import type { ScenarioConfig } from "../scenarios";
import { resolveScenarios } from "../scenarios";
import { applyScenario } from "./utils";
import {
  wsDocumentList,
  wsDocGettingStarted,
  wsDocApiReference,
  wsNavigationList,
  wsNavGettingStarted,
  wsNavApiReference,
  wsVersionList,
  wsVersionV1,
  wsVersionV2,
  mutationSuccess,
  mutationFailure,
} from "../fixtures";

const API_BASE = "*/api/workspace";

/**
 * Workspace/admin MSW handlers for documents, navigation, versions, and mutations.
 */
export function createWorkspaceHandlers(config: ScenarioConfig = {}) {
  const scenarios = resolveScenarios(config);

  const wsSpaces = [
    {
      id: "space-guides",
      key: "guides",
      name: "Guides",
      description: "Product and developer guides",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  const wsDocuments = [wsDocGettingStarted, wsDocApiReference];
  const wsNavItems = [wsNavGettingStarted, wsNavApiReference];
  const wsVersionItems = [wsVersionV1, wsVersionV2];

  return [
    // Spaces list: GET /api/workspace/spaces
    http.get(`${API_BASE}/spaces`, async () => {
      return HttpResponse.json(wsSpaces);
    }),

    // Document list: GET /api/workspace/documents
    http.get(`${API_BASE}/documents`, async () => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceDocuments,
        { documents: "broken" },
      );
      if (scenarioResponse) return scenarioResponse;

      if (scenarios.workspaceDocuments === "not-found") {
        return HttpResponse.json({ documents: [] });
      }

      return HttpResponse.json(wsDocumentList);
    }),

    // Document detail: GET /api/workspace/documents/:id
    http.get(`${API_BASE}/documents/:id`, async ({ params }) => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceDocuments,
        { id: 999, title: null },
      );
      if (scenarioResponse) return scenarioResponse;

      const doc = wsDocuments.find((d) => d.id === params.id);
      if (!doc) {
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }

      return HttpResponse.json(doc);
    }),

    // Navigation list: GET /api/workspace/navigation
    http.get(`${API_BASE}/navigation`, async () => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceNavigation,
        { items: 42 },
      );
      if (scenarioResponse) return scenarioResponse;

      if (scenarios.workspaceNavigation === "not-found") {
        return HttpResponse.json({ items: [] });
      }

      return HttpResponse.json(wsNavigationList);
    }),

    // Navigation detail: GET /api/workspace/navigation/:id
    http.get(`${API_BASE}/navigation/:id`, async ({ params }) => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceNavigation,
        { id: 999, label: null },
      );
      if (scenarioResponse) return scenarioResponse;

      const item = wsNavItems.find((n) => n.id === params.id);
      if (!item) {
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }

      return HttpResponse.json(item);
    }),

    // Version list: GET /api/workspace/versions
    http.get(`${API_BASE}/versions`, async () => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceVersions,
        { versions: "not-array" },
      );
      if (scenarioResponse) return scenarioResponse;

      if (scenarios.workspaceVersions === "not-found") {
        return HttpResponse.json({ versions: [] });
      }

      return HttpResponse.json(wsVersionList);
    }),

    // Version detail: GET /api/workspace/versions/:id
    http.get(`${API_BASE}/versions/:id`, async ({ params }) => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceVersions,
        { id: 999, label: null },
      );
      if (scenarioResponse) return scenarioResponse;

      const ver = wsVersionItems.find((v) => v.id === params.id);
      if (!ver) {
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }

      return HttpResponse.json(ver);
    }),

    // Document mutation: POST /api/workspace/documents/:id/publish
    http.post(`${API_BASE}/documents/:id/publish`, async () => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceMutation,
        { success: "maybe" },
      );
      if (scenarioResponse) return scenarioResponse;

      if (scenarios.workspaceMutation === "not-found") {
        return HttpResponse.json(mutationFailure, { status: 400 });
      }

      return HttpResponse.json(mutationSuccess);
    }),

    // Navigation mutation: POST /api/workspace/navigation/:id/reorder
    http.post(`${API_BASE}/navigation/:id/reorder`, async () => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceMutation,
        { success: "maybe" },
      );
      if (scenarioResponse) return scenarioResponse;

      if (scenarios.workspaceMutation === "not-found") {
        return HttpResponse.json(mutationFailure, { status: 400 });
      }

      return HttpResponse.json(mutationSuccess);
    }),

    // Version mutation: POST /api/workspace/versions/:id/publish
    http.post(`${API_BASE}/versions/:id/publish`, async () => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceMutation,
        { success: "maybe" },
      );
      if (scenarioResponse) return scenarioResponse;

      if (scenarios.workspaceMutation === "not-found") {
        return HttpResponse.json(mutationFailure, { status: 400 });
      }

      return HttpResponse.json(mutationSuccess);
    }),
  ];
}
