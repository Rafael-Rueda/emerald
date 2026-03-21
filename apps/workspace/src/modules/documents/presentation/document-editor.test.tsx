import React from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { AppProviders } from "@emerald/ui/providers";
import type { DocumentContent } from "@emerald/contracts";
import type * as EditorModule from "../../editor";
import { DocumentEditor } from "./document-editor";

const mocks = vi.hoisted(() => ({
  autosaveIsDirty: false,
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.pushMock,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../application/use-document-autosave", () => ({
  useDocumentAutosave: () => ({
    status: "saved" as const,
    message: null,
    isDirty: mocks.autosaveIsDirty,
  }),
}));

vi.mock("../application/use-unsaved-changes-guard", () => ({
  useUnsavedChangesGuard: () => undefined,
}));

vi.mock("../../editor", async () => {
  const actual = await vi.importActual<typeof EditorModule>("../../editor");

  function extractEditorText(node: unknown): string {
    if (typeof node === "string") {
      return node;
    }

    if (!node || typeof node !== "object") {
      return "";
    }

    const candidate = node as {
      text?: string;
      content?: unknown[];
    };

    const ownText = typeof candidate.text === "string" ? candidate.text : "";
    const nestedText = Array.isArray(candidate.content)
      ? candidate.content.map((child) => extractEditorText(child)).join(" ")
      : "";

    return `${ownText} ${nestedText}`.trim();
  }

  return {
    ...actual,
    EditorContent: ({
      initialContent,
    }: {
      initialContent?: unknown;
    }) => (
      <div data-testid="mock-editor-content">
        {extractEditorText(initialContent)}
      </div>
    ),
  };
});

function paragraphDocument(text: string): DocumentContent {
  return {
    type: "doc",
    version: 1,
    children: [
      {
        type: "paragraph",
        children: [{ type: "text", text }],
      },
    ],
  };
}

const editorDocumentResponse = {
  id: "doc-editor-1",
  title: "Revision Test Document",
  slug: "revision-test-document",
  space: "guides",
  spaceId: "space-guides",
  releaseVersionId: "ver-guides-v1",
  status: "draft",
  content_json: paragraphDocument("Current editor content"),
  currentRevisionId: "rev-doc-editor-3",
  createdBy: "author@test.com",
  updatedBy: "author@test.com",
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-03T12:00:00.000Z",
};

const revisionsResponse = {
  revisions: [
    {
      id: "rev-doc-editor-1",
      documentId: "doc-editor-1",
      revisionNumber: 1,
      content_json: paragraphDocument("Restored revision content"),
      createdBy: "author@test.com",
      changeNote: "Initial revision",
      createdAt: "2026-01-01T10:00:00.000Z",
    },
    {
      id: "rev-doc-editor-3",
      documentId: "doc-editor-1",
      revisionNumber: 3,
      content_json: paragraphDocument("Current editor content"),
      createdBy: "author@test.com",
      changeNote: "Latest revision",
      createdAt: "2026-01-03T12:00:00.000Z",
    },
  ],
  total: 2,
};

describe("DocumentEditor", () => {
  const server = setupServer(
    http.get("*/api/workspace/spaces", () =>
      HttpResponse.json([
        {
          id: "space-guides",
          key: "guides",
          name: "Guides",
          description: "Workspace guides",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ]),
    ),
    http.get("*/api/workspace/versions", () =>
      HttpResponse.json({
        versions: [
          {
            id: "ver-guides-v1",
            spaceId: "space-guides",
            key: "v1",
            label: "Version 1",
            status: "published",
            isDefault: true,
            publishedAt: "2026-01-01T00:00:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    ),
    http.get("*/api/workspace/documents/:id", () =>
      HttpResponse.json(editorDocumentResponse),
    ),
    http.get("*/api/workspace/documents/:id/revisions", () =>
      HttpResponse.json(revisionsResponse),
    ),
    http.post("*/api/workspace/documents/:id/publish", () =>
      HttpResponse.json({ success: true, message: "Document published." }),
    ),
  );

  function renderEditor() {
    return render(
      <AppProviders defaultTheme="light">
        <DocumentEditor mode="edit" documentId="doc-editor-1" />
      </AppProviders>,
    );
  }

  beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    mocks.autosaveIsDirty = false;
    mocks.pushMock.mockReset();
  });

  it("renders revision history list sorted by descending date with revision metadata", async () => {
    const user = userEvent.setup();
    renderEditor();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Edit Document/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Revision History/i }));

    await waitFor(() => {
      expect(screen.getByTestId("document-editor-revision-history-panel")).toBeInTheDocument();
    });

    const revisionButtons = within(screen.getByTestId("document-editor-revision-list"))
      .getAllByRole("button");

    expect(revisionButtons[0]).toHaveTextContent("#3");
    expect(revisionButtons[0]).toHaveTextContent("2026-01-03T12:00:00.000Z");
    expect(revisionButtons[1]).toHaveTextContent("#1");
    expect(revisionButtons[1]).toHaveTextContent("2026-01-01T10:00:00.000Z");
  });

  it("shows restore confirmation and warns about unsaved changes", async () => {
    mocks.autosaveIsDirty = true;
    const user = userEvent.setup();
    renderEditor();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Edit Document/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Revision History/i }));

    await waitFor(() => {
      expect(screen.getByTestId("document-editor-revision-history-panel")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Revision #1/i }));
    await user.click(screen.getByRole("button", { name: /Restore this revision/i }));

    await waitFor(() => {
      expect(screen.getByTestId("document-editor-restore-confirmation")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/current unsaved changes will be discarded/i),
    ).toBeInTheDocument();
  });

  it("updates editor content after restore confirmation", async () => {
    const user = userEvent.setup();
    renderEditor();

    await waitFor(() => {
      expect(screen.getByTestId("mock-editor-content")).toHaveTextContent(
        "Current editor content",
      );
    });

    await user.click(screen.getByRole("button", { name: /Revision History/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Revision #1/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Revision #1/i }));
    await user.click(screen.getByRole("button", { name: /Restore this revision/i }));

    await waitFor(() => {
      expect(screen.getByTestId("document-editor-restore-confirmation")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Confirm restore/i }));

    await waitFor(() => {
      expect(screen.getByTestId("mock-editor-content")).toHaveTextContent(
        "Restored revision content",
      );
    });
  });

  it("renders a draft status badge in the editor header", async () => {
    renderEditor();

    await waitFor(() => {
      expect(screen.getByTestId("document-editor-status-badge")).toHaveTextContent(
        "Draft",
      );
    });
  });

  it("opens the publish confirmation dialog from the editor header", async () => {
    const user = userEvent.setup();
    renderEditor();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Publish$/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^Publish$/i }));

    await waitFor(() => {
      expect(screen.getByTestId("document-editor-publish-confirmation")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Publish this document? This will make it publicly visible."),
    ).toBeInTheDocument();
  });

  it("cancels publish without sending a publish request", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    try {
      renderEditor();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^Publish$/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /^Publish$/i }));

      await waitFor(() => {
        expect(screen.getByTestId("document-editor-publish-confirmation")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /^Cancel$/i }));

      await waitFor(() => {
        expect(screen.queryByTestId("document-editor-publish-confirmation")).not.toBeInTheDocument();
      });

      expect(screen.getByTestId("document-editor-status-badge")).toHaveTextContent("Draft");
      expect(
        fetchSpy.mock.calls.some(
          ([input, init]) =>
            input === "/api/workspace/documents/doc-editor-1/publish"
            && init?.method === "POST",
        ),
      ).toBe(false);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("confirms publish, sends the API call, and updates badge to published", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    server.use(
      http.post("*/api/workspace/documents/:id/publish", async () => {
        await delay(120);
        return HttpResponse.json({ success: true, message: "Document published." });
      }),
    );

    try {
      renderEditor();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^Publish$/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /^Publish$/i }));
      await user.click(screen.getByRole("button", { name: /^Confirm$/i }));

      expect(screen.getByTestId("document-editor-status-badge")).toHaveTextContent("Published");

      await waitFor(() => {
        expect(screen.getByTestId("document-editor-publish-feedback-success")).toHaveTextContent(
          "Document published.",
        );
      });

      await waitFor(() => {
        expect(
          fetchSpy.mock.calls.some(
            ([input, init]) =>
              input === "/api/workspace/documents/doc-editor-1/publish"
              && init?.method === "POST",
          ),
        ).toBe(true);
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("rolls back the optimistic published badge when publish fails", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/workspace/documents/:id/publish", () =>
        HttpResponse.json({ error: "publish failed" }, { status: 500 }),
      ),
    );

    renderEditor();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Publish$/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^Publish$/i }));
    await user.click(screen.getByRole("button", { name: /^Confirm$/i }));

    await waitFor(() => {
      expect(screen.getByTestId("document-editor-status-badge")).toHaveTextContent("Draft");
    });

    expect(screen.getByTestId("document-editor-publish-feedback-error")).toHaveTextContent(
      "Request failed with status 500",
    );
  });

  it("disables publish button for already published documents", async () => {
    server.use(
      http.get("*/api/workspace/documents/:id", () =>
        HttpResponse.json({
          ...editorDocumentResponse,
          status: "published",
        }),
      ),
    );

    renderEditor();

    const publishButton = await screen.findByRole("button", { name: /^Publish$/i });
    expect(publishButton).toBeDisabled();
    expect(publishButton).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByTestId("document-editor-status-badge")).toHaveTextContent("Published");
  });
});
