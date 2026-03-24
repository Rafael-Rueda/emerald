import { http, HttpResponse } from "msw";
import type { WorkspaceNavigation } from "@emerald/contracts";
import type { ScenarioConfig } from "../scenarios";
import { resolveScenarios } from "../scenarios";
import { applyScenario } from "./utils";
import {
  mutationSuccess,
  mutationFailure,
} from "../fixtures";
import { store } from "../store";

const API_BASE = "*/api/workspace";

/**
 * Workspace/admin MSW handlers for documents, navigation, versions, and mutations.
 */
export function createWorkspaceHandlers(config: ScenarioConfig = {}) {
  const scenarios = resolveScenarios(config);

  function nowIso() {
    return new Date().toISOString();
  }

  function findNode(tree: WorkspaceNavigation[], id: string): WorkspaceNavigation | null {
    for (const node of tree) {
      if (node.id === id) {
        return node;
      }

      const child = findNode(node.children, id);
      if (child) {
        return child;
      }
    }

    return null;
  }

  function findSiblings(
    tree: WorkspaceNavigation[],
    parentId: string | null,
  ): WorkspaceNavigation[] {
    if (!parentId) {
      return tree;
    }

    const parentNode = findNode(tree, parentId);
    return parentNode?.children ?? [];
  }

  function reindexSiblings(siblings: WorkspaceNavigation[]) {
    siblings.forEach((node, index) => {
      node.order = index;
      node.updatedAt = nowIso();
    });
  }

  function detachNode(tree: WorkspaceNavigation[], id: string): WorkspaceNavigation | null {
    const ownIndex = tree.findIndex((node) => node.id === id);
    if (ownIndex >= 0) {
      const [removedNode] = tree.splice(ownIndex, 1);
      reindexSiblings(tree);
      return removedNode ?? null;
    }

    for (const node of tree) {
      const detached = detachNode(node.children, id);
      if (detached) {
        return detached;
      }
    }

    return null;
  }

  function isDescendant(
    tree: WorkspaceNavigation[],
    sourceId: string,
    targetParentId: string | null,
  ): boolean {
    if (!targetParentId) {
      return false;
    }

    const sourceNode = findNode(tree, sourceId);
    if (!sourceNode) {
      return false;
    }

    const stack = [...sourceNode.children];
    while (stack.length > 0) {
      const candidate = stack.pop();
      if (!candidate) {
        continue;
      }

      if (candidate.id === targetParentId) {
        return true;
      }

      stack.push(...candidate.children);
    }

    return false;
  }

  return [
    // Spaces list: GET /api/workspace/spaces
    http.get(`${API_BASE}/spaces`, async () => {
      return HttpResponse.json(store.getSpaces());
    }),

    // Space detail: GET /api/workspace/spaces/:id
    http.get(`${API_BASE}/spaces/:id`, async ({ params }) => {
      const space = store.getSpace(params.id as string);
      if (!space) return HttpResponse.json({ error: "Not found" }, { status: 404 });
      return HttpResponse.json(space);
    }),

    // Space create: POST /api/workspace/spaces
    http.post(`${API_BASE}/spaces`, async ({ request }) => {
      const body = await request.json() as any;
      const existing = store.getSpaces().find((s) => s.key === body.key);
      if (existing) return HttpResponse.json({ error: "Key already exists" }, { status: 409 });
      const space = store.createSpace({ key: body.key, name: body.name, description: body.description ?? "" });
      return HttpResponse.json(space, { status: 201 });
    }),

    // Space update: PATCH /api/workspace/spaces/:id
    http.patch(`${API_BASE}/spaces/:id`, async ({ params, request }) => {
      const body = await request.json() as any;
      const space = store.updateSpace(params.id as string, body);
      if (!space) return HttpResponse.json({ error: "Not found" }, { status: 404 });
      return HttpResponse.json(space);
    }),

    // Space delete: DELETE /api/workspace/spaces/:id
    http.delete(`${API_BASE}/spaces/:id`, async ({ params }) => {
      const space = store.deleteSpace(params.id as string);
      if (!space) return HttpResponse.json({ error: "Not found" }, { status: 404 });
      return HttpResponse.json(space);
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

      return HttpResponse.json(store.getWorkspaceDocuments());
    }),

    // Document detail: GET /api/workspace/documents/:id
    http.get(`${API_BASE}/documents/:id`, async ({ params }) => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceDocuments,
        { id: 999, title: null },
      );
      if (scenarioResponse) return scenarioResponse;

      const doc = store.getWorkspaceDocument(params.id as string);
      if (!doc) {
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }

      // If requested from editor, include latest content_json if any
      const revs = store.getRevisions(params.id as string);
      const latestRev = revs.length > 0 ? revs[0] : null;
      const editorDoc = {
        ...doc,
        spaceId: (doc as any).spaceId ?? "space-guides",
        releaseVersionId: (doc as any).releaseVersionId ?? "ver-v1",
        currentRevisionId: latestRev?.id ?? null,
        createdBy: latestRev?.createdBy ?? "admin@test.com",
        updatedBy: latestRev?.createdBy ?? "admin@test.com",
        createdAt: doc.updatedAt,
        content_json: latestRev?.content_json ?? {
          type: "doc",
          version: 1,
          children: [{ type: "paragraph", children: [{ type: "text", text: "" }] }],
        },
      };

      return HttpResponse.json(editorDoc);
    }),

    // Document creation (draft): POST /api/workspace/documents
    http.post(`${API_BASE}/documents`, async ({ request }) => {
      const body = await request.json() as any;
      const createdAt = nowIso();
      const newDoc = {
        id: `doc-${Math.random().toString(36).slice(2, 9)}`,
        title: body.title,
        slug: body.slug,
        space: store.getSpaces()[0]?.key ?? "default",
        spaceId: body.spaceId,
        releaseVersionId: body.releaseVersionId,
        status: "draft",
        createdAt,
        updatedAt: createdAt,
      };
      store.workspaceDocuments.push(newDoc as any);

      let currentRevisionId: string | null = null;
      if (body.content_json) {
        const rev = store.createRevision(newDoc.id, body.content_json, "Initial draft");
        currentRevisionId = rev.id;
      }

      return HttpResponse.json({
        ...newDoc,
        currentRevisionId,
        createdBy: "admin@test.com",
        updatedBy: "admin@test.com",
        content_json: body.content_json ?? null,
      });
    }),

    // Document revision creation: POST /api/workspace/documents/:id/revisions
    http.post(`${API_BASE}/documents/:id/revisions`, async ({ params, request }) => {
      const body = await request.json() as any;
      const rev = store.createRevision(
        params.id as string,
        body.content_json,
        body.changeNote || "Autosave update"
      );
      return HttpResponse.json(rev);
    }),

    // Document unpublish: POST /api/workspace/documents/:id/unpublish
    http.post(`${API_BASE}/documents/:id/unpublish`, async ({ params }) => {
      const wsDoc = store.getWorkspaceDocument(params.id as string);
      if (!wsDoc) {
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }

      (wsDoc as any).status = "draft";
      (wsDoc as any).updatedAt = nowIso();

      const revs = store.getRevisions(params.id as string);
      const latestRev = revs.length > 0 ? revs[0] : null;

      return HttpResponse.json({
        ...wsDoc,
        spaceId: (wsDoc as any).spaceId ?? "space-guides",
        releaseVersionId: (wsDoc as any).releaseVersionId ?? "ver-v1",
        currentRevisionId: latestRev?.id ?? null,
        createdBy: "admin@test.com",
        updatedBy: "admin@test.com",
        createdAt: (wsDoc as any).createdAt ?? wsDoc.updatedAt,
        content_json: latestRev?.content_json ?? null,
      });
    }),

    // Document revisions list: GET /api/workspace/documents/:id/revisions
    http.get(`${API_BASE}/documents/:id/revisions`, async ({ params }) => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceDocuments,
        { revisions: "broken" },
      );
      if (scenarioResponse) return scenarioResponse;

      const documentId = String(params.id ?? "");
      const revisions = store.getRevisions(documentId);

      return HttpResponse.json({
        revisions,
        total: revisions.length,
      });
    }),

    // Navigation list: GET /api/workspace/navigation
    http.get(`${API_BASE}/navigation`, async ({ request }) => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceNavigation,
        { items: 42 },
      );
      if (scenarioResponse) return scenarioResponse;

      if (scenarios.workspaceNavigation === "not-found") {
        return HttpResponse.json({ items: [] });
      }

      const url = new URL(request.url);
      const releaseVersionId = url.searchParams.get("releaseVersionId");
      const nav = store.getNavigation();

      if (!releaseVersionId) {
        return HttpResponse.json(nav);
      }

      function filterByVersion(nodes: WorkspaceNavigation[]): WorkspaceNavigation[] {
        return nodes
          .filter((node) => node.releaseVersionId === releaseVersionId)
          .map((node) => ({
            ...node,
            children: filterByVersion(node.children),
          }));
      }

      return HttpResponse.json({ items: filterByVersion(nav.items) });
    }),

    // Navigation detail: GET /api/workspace/navigation/:id
    http.get(`${API_BASE}/navigation/:id`, async ({ params }) => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceNavigation,
        { id: 999, label: null },
      );
      if (scenarioResponse) return scenarioResponse;

      const item = findNode(store.getNavigation().items, String(params.id ?? ""));
      if (!item) {
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }

      return HttpResponse.json(item);
    }),

    // Navigation mutation: POST /api/workspace/navigation (create)
    http.post(`${API_BASE}/navigation`, async ({ request }) => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceMutation,
        { success: "maybe" },
      );
      if (scenarioResponse) return scenarioResponse;

      const body = (await request.json()) as {
        spaceId: string;
        releaseVersionId?: string | null;
        parentId?: string | null;
        documentId?: string | null;
        label: string;
        slug: string;
        order: number;
        nodeType: "document" | "group" | "external_link";
        externalUrl?: string | null;
      };

      const parentId = body.parentId ?? null;
      const wsNavItems = store.getNavigation().items;
      const siblings = findSiblings(wsNavItems, parentId);
      const nextOrder = Math.max(0, Math.min(body.order, siblings.length));
      const createdAt = nowIso();

      const node: WorkspaceNavigation = {
        id: `nav-${Math.random().toString(36).slice(2, 9)}`,
        spaceId: body.spaceId,
        releaseVersionId: body.releaseVersionId ?? null,
        parentId,
        documentId: body.documentId ?? null,
        label: body.label,
        slug: body.slug,
        order: nextOrder,
        nodeType: body.nodeType,
        externalUrl: body.externalUrl ?? null,
        createdAt,
        updatedAt: createdAt,
        children: [],
      };

      siblings.splice(nextOrder, 0, node);
      reindexSiblings(siblings);

      return HttpResponse.json(node, { status: 201 });
    }),

    // Navigation mutation: PATCH /api/workspace/navigation/:id
    http.patch(`${API_BASE}/navigation/:id`, async ({ params, request }) => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceMutation,
        { success: "maybe" },
      );
      if (scenarioResponse) return scenarioResponse;

      const navigationId = String(params.id ?? "");
      const node = findNode(store.getNavigation().items, navigationId);

      if (!node) {
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }

      const body = (await request.json()) as Partial<{
        documentId: string | null;
        label: string;
        slug: string;
        order: number;
        nodeType: "document" | "group" | "external_link";
        externalUrl: string | null;
      }>;

      if (body.documentId !== undefined) {
        node.documentId = body.documentId;
      }

      if (body.label !== undefined) {
        node.label = body.label;
      }

      if (body.slug !== undefined) {
        node.slug = body.slug;
      }

      if (body.nodeType !== undefined) {
        node.nodeType = body.nodeType;
      }

      if (body.externalUrl !== undefined) {
        node.externalUrl = body.externalUrl;
      }

      node.updatedAt = nowIso();

      return HttpResponse.json(node);
    }),

    // Navigation mutation: POST /api/workspace/navigation/:id/move
    http.post(`${API_BASE}/navigation/:id/move`, async ({ params, request }) => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceMutation,
        { success: "maybe" },
      );
      if (scenarioResponse) return scenarioResponse;

      const wsNavItems = store.getNavigation().items;
      const navigationId = String(params.id ?? "");
      const body = (await request.json()) as {
        parentId?: string | null;
        order: number;
      };

      const parentId = body.parentId ?? null;

      if (isDescendant(wsNavItems, navigationId, parentId)) {
        return HttpResponse.json({ message: "Circular reference" }, { status: 400 });
      }

      const detached = detachNode(wsNavItems, navigationId);
      if (!detached) {
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }

      const siblings = findSiblings(wsNavItems, parentId);
      const nextOrder = Math.max(0, Math.min(body.order, siblings.length));

      detached.parentId = parentId;
      detached.order = nextOrder;
      detached.updatedAt = nowIso();

      siblings.splice(nextOrder, 0, detached);
      reindexSiblings(siblings);

      return HttpResponse.json(detached);
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

      return HttpResponse.json(store.getVersions());
    }),

    // Version detail: GET /api/workspace/versions/:id
    http.get(`${API_BASE}/versions/:id`, async ({ params }) => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceVersions,
        { id: 999, label: null },
      );
      if (scenarioResponse) return scenarioResponse;

      const ver = store.getVersions().versions.find((v) => v.id === params.id);
      if (!ver) {
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }

      return HttpResponse.json(ver);
    }),

    // Document mutation: POST /api/workspace/documents/:id/publish
    http.post(`${API_BASE}/documents/:id/publish`, async ({ params }) => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceMutation,
        { success: "maybe" },
      );
      if (scenarioResponse) return scenarioResponse;

      if (scenarios.workspaceMutation === "not-found") {
        return HttpResponse.json(mutationFailure, { status: 400 });
      }

      const success = store.publishDocument(params.id as string);
      if (!success) {
        return HttpResponse.json({ success: false, message: "Document not found" }, { status: 404 });
      }

      return HttpResponse.json(mutationSuccess);
    }),

    // Navigation legacy mutation alias: POST /api/workspace/navigation/:id/reorder
    http.post(`${API_BASE}/navigation/:id/reorder`, async ({ params }) => {
      const scenarioResponse = await applyScenario(
        scenarios.workspaceMutation,
        { success: "maybe" },
      );
      if (scenarioResponse) return scenarioResponse;

      if (scenarios.workspaceMutation === "not-found") {
        return HttpResponse.json(mutationFailure, { status: 400 });
      }

      const wsNavItems = store.getNavigation().items;
      const navigationId = String(params.id ?? "");
      const detached = detachNode(wsNavItems, navigationId);
      if (!detached) {
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }

      detached.parentId = null;
      detached.updatedAt = nowIso();
      wsNavItems.unshift(detached);
      reindexSiblings(wsNavItems);

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
