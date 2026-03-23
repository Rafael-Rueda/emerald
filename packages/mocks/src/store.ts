import type {
  Space,
  WorkspaceDocument,
  WorkspaceNavigation,
} from "@emerald/contracts";
import {
  allDocuments,
  wsDocumentList,
  wsDocumentRevisions,
  wsNavigationList,
  wsVersionList,
} from "./fixtures";

type PublicDocument = (typeof allDocuments)[number];

type Revision = {
  id: string;
  documentId: string;
  revisionNumber: number;
  content_json: (typeof wsDocumentRevisions)["doc-getting-started"][number]["content_json"];
  createdBy: string;
  changeNote: string | null;
  createdAt: string;
};

type StoreState = {
  spaces: Space[];
  workspaceDocuments: WorkspaceDocument[];
  navigationItems: WorkspaceNavigation[];
  revisions: Record<string, Revision[]>;
  documents: PublicDocument[];
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toLabel(key: string): string {
  const normalized = key.replace(/[-_]+/g, " ").trim();
  if (!normalized) {
    return "Space";
  }

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function createInitialSpaces(): Space[] {
  const defaultTimestamp = "2025-01-01T00:00:00Z";
  const spacesById = new Map<string, Space>();

  for (const document of wsDocumentList.documents) {
    const spaceKey = document.space;
    const spaceId = document.spaceId ?? `space-${spaceKey}`;
    if (spacesById.has(spaceId)) {
      continue;
    }

    spacesById.set(spaceId, {
      id: spaceId,
      key: spaceKey,
      name: toLabel(spaceKey),
      description: `${toLabel(spaceKey)} documentation`,
      createdAt: defaultTimestamp,
      updatedAt: defaultTimestamp,
    });
  }

  if (spacesById.size > 0) {
    return [...spacesById.values()];
  }

  return [
    {
      id: "space-guides",
      key: "guides",
      name: "Guides",
      description: "Guides documentation",
      createdAt: defaultTimestamp,
      updatedAt: defaultTimestamp,
    },
  ];
}

function createInitialRevisions(): Record<string, Revision[]> {
  const entries = Object.entries(wsDocumentRevisions).map(
    ([documentId, revisions]) => [
      documentId,
      deepClone(revisions) as unknown as Revision[],
    ],
  );

  return Object.fromEntries(entries);
}

function createInitialState(): StoreState {
  const documents = allDocuments;

  return {
    spaces: createInitialSpaces(),
    workspaceDocuments: deepClone(wsDocumentList.documents),
    navigationItems: deepClone(wsNavigationList.items),
    revisions: createInitialRevisions(),
    documents: deepClone(documents),
  };
}

export function createStore() {
  let state = createInitialState();

  return {
    get workspaceDocuments() {
      return state.workspaceDocuments;
    },

    getSpaces(): Space[] {
      return state.spaces;
    },

    getSpace(id: string): Space | null {
      return state.spaces.find((space) => space.id === id) ?? null;
    },

    createSpace(data: { key: string; name: string; description: string }): Space {
      const timestamp = nowIso();
      const key = data.key.trim();
      const existing = state.spaces.find((space) => space.key === key);
      if (existing) {
        return existing;
      }

      const newSpace: Space = {
        id: `space-${Math.random().toString(36).slice(2, 9)}`,
        key,
        name: data.name,
        description: data.description,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      state.spaces.push(newSpace);
      return newSpace;
    },

    updateSpace(
      id: string,
      data: Partial<Pick<Space, "key" | "name" | "description">>,
    ): Space | null {
      const space = state.spaces.find((item) => item.id === id);
      if (!space) {
        return null;
      }

      if (data.key !== undefined) {
        space.key = data.key;
      }

      if (data.name !== undefined) {
        space.name = data.name;
      }

      if (data.description !== undefined) {
        space.description = data.description;
      }

      space.updatedAt = nowIso();
      return space;
    },

    deleteSpace(id: string): Space | null {
      const index = state.spaces.findIndex((space) => space.id === id);
      if (index < 0) {
        return null;
      }

      const [removedSpace] = state.spaces.splice(index, 1);
      return removedSpace ?? null;
    },

    findPublicDocument(
      space: string,
      version: string,
      slug: string,
    ): PublicDocument | null {
      return (
        state.documents.find(
          (document) =>
            document.space === space &&
            document.version === version &&
            document.slug === slug,
        ) ?? null
      );
    },

    getWorkspaceDocuments(): { documents: WorkspaceDocument[] } {
      return { documents: state.workspaceDocuments };
    },

    getWorkspaceDocument(id: string): WorkspaceDocument | null {
      return state.workspaceDocuments.find((document) => document.id === id) ?? null;
    },

    publishDocument(id: string): boolean {
      const document = state.workspaceDocuments.find((item) => item.id === id);
      if (!document) {
        return false;
      }

      document.status = "published";
      document.updatedAt = nowIso();
      return true;
    },

    getRevisions(documentId: string): Revision[] {
      return state.revisions[documentId] ?? [];
    },

    createRevision(
      documentId: string,
      content_json: Revision["content_json"],
      changeNote?: string | null,
    ): Revision {
      const existing = state.revisions[documentId] ?? [];
      const currentMaxRevisionNumber = existing.reduce(
        (max, revision) => Math.max(max, revision.revisionNumber),
        0,
      );
      const nextRevisionNumber = currentMaxRevisionNumber + 1;

      const revision: Revision = {
        id: `rev-${documentId}-${nextRevisionNumber}`,
        documentId,
        revisionNumber: nextRevisionNumber,
        content_json,
        createdBy: "admin@test.com",
        changeNote: changeNote ?? null,
        createdAt: nowIso(),
      };

      state.revisions[documentId] = [revision, ...existing];
      return revision;
    },

    getNavigation(): { items: WorkspaceNavigation[] } {
      return { items: state.navigationItems };
    },

    getVersions() {
      return deepClone(wsVersionList);
    },

    reset(): void {
      state = createInitialState();
    },
  };
}

export const store = createStore();
