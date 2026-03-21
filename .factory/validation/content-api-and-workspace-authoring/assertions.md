# Validation Contract — Area 3 & 4
## content-api + workspace-authoring-ui
Generated: 2026-03-20

---

## Area 3 — content-api (VAL-CONTENT)

These assertions cover the NestJS backend endpoints that will replace the current MSW mock layer.
Auth assumption: all `/api/workspace/*` routes require a valid bearer token unless noted.

---

### Documents Bounded Context

**VAL-CONTENT-001: Create document — success**
An AUTHOR sends `POST /api/workspace/documents` with `{ title, slug, space }`. The API responds 201 with a `WorkspaceDocument` whose `status` equals `"draft"` and whose `id`, `slug`, and `updatedAt` are populated.
Evidence: HTTP 201 response body validated against `WorkspaceDocumentSchema`; `status === "draft"`.

**VAL-CONTENT-002: Create document — missing required field**
An AUTHOR sends `POST /api/workspace/documents` with `title` omitted. The API responds 422 (or 400) with a structured validation error listing the missing field; no document is persisted.
Evidence: HTTP 4xx response; subsequent `GET /api/workspace/documents` does not include a document matching the attempted slug.

**VAL-CONTENT-003: Create document — duplicate slug within space**
An AUTHOR sends `POST /api/workspace/documents` with a `slug` that already exists in the same `space`. The API responds 409 with a conflict message; no duplicate record is created.
Evidence: HTTP 409 response; `GET /api/workspace/documents` still contains exactly one document with that slug.

**VAL-CONTENT-004: List documents — returns array conforming to contract**
An AUTHOR sends `GET /api/workspace/documents`. The API responds 200 with a body that satisfies `WorkspaceDocumentListSchema` (field `documents` is an array; each element has `id`, `title`, `slug`, `space`, `status`, `updatedAt`).
Evidence: HTTP 200; response parsed by `WorkspaceDocumentListSchema` without errors.

**VAL-CONTENT-005: Get document by ID — found**
An AUTHOR sends `GET /api/workspace/documents/:id` for an existing document. The API responds 200 with a body satisfying `WorkspaceDocumentSchema` and the `id` matching the path parameter.
Evidence: HTTP 200; `id` in response equals the requested `:id`.

**VAL-CONTENT-006: Get document by ID — not found**
An AUTHOR sends `GET /api/workspace/documents/:id` with a non-existent ID. The API responds 404 with an error payload; no document data is returned.
Evidence: HTTP 404 response.

**VAL-CONTENT-007: Update document — partial patch**
An AUTHOR sends `PATCH /api/workspace/documents/:id` with `{ title: "New Title" }`. The API responds 200 with the updated document where `title === "New Title"` and `updatedAt` is later than the original value.
Evidence: HTTP 200; `title` in response equals `"New Title"`; `updatedAt` is a later ISO timestamp.

**VAL-CONTENT-008: Delete document**
An AUTHOR sends `DELETE /api/workspace/documents/:id`. The API responds 200 (or 204). A subsequent `GET /api/workspace/documents/:id` returns 404.
Evidence: HTTP 200/204 on delete; HTTP 404 on re-fetch.

**VAL-CONTENT-009: Publish document — draft to published**
An AUTHOR sends `POST /api/workspace/documents/:id/publish` for a draft document. The API responds 200 with `{ success: true }` satisfying `MutationResultSchema`. A subsequent `GET /api/workspace/documents/:id` shows `status === "published"`.
Evidence: HTTP 200; `MutationResultSchema` parse; status field on re-fetch.

**VAL-CONTENT-010: Publish document — already published**
An AUTHOR sends `POST /api/workspace/documents/:id/publish` for a document already in `"published"` state. The API responds 409 (or 422) indicating the document is already published; status remains `"published"`.
Evidence: HTTP 4xx; document status unchanged on re-fetch.

---

### Document Revisions

**VAL-CONTENT-011: Create revision**
An AUTHOR sends `POST /api/workspace/documents/:id/revisions` with a body snapshot. The API responds 201 with a revision object containing `revId`, `documentId`, `createdAt`, and the snapshot body. The revision is returned in subsequent list calls.
Evidence: HTTP 201; `revId` is a non-empty string; `GET /api/workspace/documents/:id/revisions` includes the new revision.

**VAL-CONTENT-012: List revisions — chronological order**
An AUTHOR sends `GET /api/workspace/documents/:id/revisions` after creating multiple revisions. The API responds 200 with a list where revisions are ordered newest-first (or oldest-first — order must be consistent and documented). Count matches the number of saved revisions.
Evidence: HTTP 200; revision list is sorted by `createdAt` in the documented order.

**VAL-CONTENT-013: Get single revision**
An AUTHOR sends `GET /api/workspace/documents/:id/revisions/:revId`. The API responds 200 with the exact revision body matching what was submitted at creation time.
Evidence: HTTP 200; body content equals the original submitted snapshot.

**VAL-CONTENT-014: Get revision — wrong document**
An AUTHOR sends `GET /api/workspace/documents/:id/revisions/:revId` where `:revId` belongs to a different document. The API responds 404; no content is leaked.
Evidence: HTTP 404.

---

### Navigation Nodes

**VAL-CONTENT-015: Create navigation node**
An AUTHOR sends `POST /api/workspace/navigation` with `{ label, slug, space, parentId: null, order }`. The API responds 201 with a node object conforming to `WorkspaceNavigationSchema`.
Evidence: HTTP 201; response parsed by `WorkspaceNavigationSchema` without errors.

**VAL-CONTENT-016: Get navigation tree**
An AUTHOR sends `GET /api/workspace/navigation`. The API responds 200 with `{ items: [...] }` where each item conforms to `WorkspaceNavigationSchema` and parent-child relationships are correctly reflected (child nodes have `parentId` equal to their parent's `id`).
Evidence: HTTP 200; all items parse against schema; child `parentId` values are valid IDs from the same list.

**VAL-CONTENT-017: Update navigation node**
An AUTHOR sends `PATCH /api/workspace/navigation/:id` with `{ label: "Renamed" }`. The API responds 200 with the updated node. The navigation tree reflects the new label.
Evidence: HTTP 200; `label` in response equals `"Renamed"`; `GET /api/workspace/navigation` shows updated label.

**VAL-CONTENT-018: Move navigation node**
An AUTHOR sends `POST /api/workspace/navigation/:id/move` with `{ parentId, order }` placing the node under a new parent at a specified position. The API responds 200. The navigation tree shows the node at its new position with updated `parentId` and `order`.
Evidence: HTTP 200; `GET /api/workspace/navigation` shows node at new position.

---

### Release Versions

**VAL-CONTENT-019: Create version**
An AUTHOR sends `POST /api/workspace/versions` with `{ label, slug, space }`. The API responds 201 with a `WorkspaceVersion` whose `status === "draft"` and `isDefault === false`.
Evidence: HTTP 201; `status === "draft"`; `isDefault === false`.

**VAL-CONTENT-020: List versions**
An AUTHOR sends `GET /api/workspace/versions`. The API responds 200 with `WorkspaceVersionListSchema` — `versions` is an array; each item has `id`, `label`, `slug`, `space`, `status`, `isDefault`.
Evidence: HTTP 200; `WorkspaceVersionListSchema` parses without errors.

**VAL-CONTENT-021: Publish version**
An AUTHOR sends `POST /api/workspace/versions/:id/publish` for a draft version. The API responds 200 with `{ success: true }`. Subsequent `GET /api/workspace/versions/:id` shows `status === "published"`.
Evidence: HTTP 200; `MutationResultSchema` parse; `status` on re-fetch.

**VAL-CONTENT-022: Set version as default**
An AUTHOR sends `POST /api/workspace/versions/:id/set-default`. The API responds 200. Subsequent `GET /api/workspace/versions` shows exactly one version with `isDefault === true`, and it is the one designated.
Evidence: HTTP 200; only one version has `isDefault === true` in the list response.

---

### Public Read Endpoints (No Auth)

**VAL-CONTENT-023: Public — list versions for a space**
An unauthenticated client sends `GET /api/public/spaces/:key/versions`. The API responds 200 with a list conforming to `VersionListResponseSchema`. No auth header is required.
Evidence: HTTP 200 without Authorization header; `VersionListResponseSchema` parse succeeds.

**VAL-CONTENT-024: Public — get navigation tree for a version**
An unauthenticated client sends `GET /api/public/spaces/:key/versions/:v/navigation`. The API responds 200 with a body conforming to `NavigationResponseSchema`, including the recursive `items` tree.
Evidence: HTTP 200 without auth; `NavigationResponseSchema` parse succeeds.

**VAL-CONTENT-025: Public — resolve document by slug**
An unauthenticated client sends `GET /api/public/spaces/:key/versions/:v/documents/:slug`. The API responds 200 with a body conforming to `DocumentResponseSchema` where `document.slug === :slug`, `document.space === :key`, `document.version === :v`.
Evidence: HTTP 200 without auth; field equality checks.

**VAL-CONTENT-026: Public — document not found returns 404**
An unauthenticated client requests a non-existent slug. The API responds 404 with an error payload; no document data is returned.
Evidence: HTTP 404.

**VAL-CONTENT-027: Public — search with query string**
An unauthenticated client sends `GET /api/public/search?q=getting`. The API responds 200 with a body conforming to `SearchResponseSchema`. Each result in `results` has `title` or `snippet` containing the query term (case-insensitive). `totalCount` equals `results.length`.
Evidence: HTTP 200; `SearchResponseSchema` parse; result filtering matches query; `totalCount` is accurate.

**VAL-CONTENT-028: Public — search with empty query returns all**
An unauthenticated client sends `GET /api/public/search?q=` or omits `q`. The API responds 200 with all indexed documents (or an empty list if none are indexed), without a server error.
Evidence: HTTP 200; `results` is an array (possibly empty); no 500.

---

### Auth Guard

**VAL-CONTENT-029: Workspace endpoints require authentication**
An unauthenticated client sends `GET /api/workspace/documents` without an Authorization header. The API responds 401; no document data is returned.
Evidence: HTTP 401 response.

---

## Area 4 — workspace-authoring-ui (VAL-WS)

These assertions cover the `apps/workspace` Next.js application once real authoring UI is implemented. Interaction layer is a browser (Playwright / manual).

---

### Create Document Page & TipTap Editor

**VAL-WS-001: Render all supported block types**
The user opens the "Create Document" page and inserts each supported block type: Heading (H1–H3), Paragraph, Bulleted List, Numbered List, Callout, Code Block, Image, Table. Each block type renders inline in the editor with correct visual styling and is selectable.
Evidence: Screenshot per block type; no console errors; each block has its expected semantic HTML or TipTap node type.

**VAL-WS-002: Code block syntax highlighting**
The user inserts a Code Block, selects a language (e.g., TypeScript), and types code. The block displays with syntax-highlighted tokens matching the selected language.
Evidence: DOM inspection shows highlighted `<span>` tokens; screenshot showing color differentiation.

**VAL-WS-003: Table creation and editing**
The user inserts a Table, adds rows and columns, and enters text in cells. Cells are navigable via Tab key. Rows and columns can be added/removed via context menu or toolbar controls.
Evidence: Table with expected row/col count visible in DOM; keyboard navigation verified.

---

### Autosave

**VAL-WS-004: Autosave triggers after 2-second debounce**
The user types in the editor. No save request is sent immediately. Exactly 2 seconds after the last keystroke, the application sends `PATCH /api/workspace/documents/:id` with the current content. The UI shows a "Saved" indicator after the response is received.
Evidence: Network log showing PATCH fires ~2 s after the last keypress; "Saved" indicator visible in UI.

**VAL-WS-005: Autosave does not fire on rapid consecutive keystrokes**
The user types continuously for 3 seconds (one keystroke per second). Only one PATCH request is sent, after 2 seconds of inactivity, not after each individual keystroke.
Evidence: Network log shows exactly one PATCH for that editing burst.

**VAL-WS-006: Autosave failure shows error indicator**
The API returns a 500 error on `PATCH`. The UI shows a distinct "Save failed" or error indicator instead of "Saved". The indicator persists until a subsequent successful save.
Evidence: Error indicator visible; "Saved" indicator is absent while in error state.

---

### Revision History Panel

**VAL-WS-007: Revision list appears in the panel**
The user opens the Revision History panel for a document that has saved revisions. The panel lists all revisions with their creation timestamps in reverse-chronological order.
Evidence: Panel renders a list; timestamps are visible; latest revision is first.

**VAL-WS-008: Clicking a revision shows its content**
The user clicks on a past revision in the panel. The editor area (or a read-only preview pane) updates to display the content captured at that revision's snapshot, distinct from the current draft content.
Evidence: Content displayed matches the body of the selected revision; a UI affordance (e.g., "Viewing revision from [date]") is visible.

**VAL-WS-009: Returning to current draft from revision view**
After viewing a past revision, the user clicks "Back to current" (or equivalent). The editor returns to the live draft content, and autosave resumes.
Evidence: Current draft content is restored; autosave fires normally after next edit.

---

### Publish Workflow

**VAL-WS-010: New document starts as draft**
The user creates a new document via the UI. The document's status badge shows "Draft" in the document list and detail view before any publish action.
Evidence: `status === "draft"` visible in UI; confirmed by `GET /api/workspace/documents/:id`.

**VAL-WS-011: AUTHOR can publish a draft document**
The user clicks "Publish" on a draft document. The UI sends `POST /api/workspace/documents/:id/publish`. On success, the status badge changes to "Published" without a page reload.
Evidence: Network log shows POST; status badge shows "Published"; no full page reload; success feedback message displayed.

**VAL-WS-012: Published document cannot be re-published**
With a document in "published" state, the "Publish" button is disabled (or hidden). Clicking it (if accessible) does not send a publish request.
Evidence: Button has `disabled` attribute or is absent; no POST to publish endpoint on click attempt.

**VAL-WS-013: Publish API failure shows error feedback**
The API returns an error on publish (4xx/5xx). The UI displays an error message; the status badge does not change to "Published".
Evidence: Error message visible; status badge still shows "Draft"; network log shows failed POST.

---

### Navigation Tree Editor

**VAL-WS-014: Navigation tree renders current structure**
The user opens the Navigation editor. All existing navigation nodes are displayed as a hierarchical tree reflecting `parentId` / `order` relationships. Child nodes are visually indented under their parent.
Evidence: Tree renders with correct nesting depth; each node shows its label.

**VAL-WS-015: Drag-and-drop reorders items**
The user drags a navigation node from position A to position B within the tree. On drop, the UI sends `POST /api/workspace/navigation/:id/move` with the new `parentId` and `order`. The tree updates to reflect the new position immediately.
Evidence: Network log shows move POST; tree visually reflects new order after drop; no page reload required.

**VAL-WS-016: Create group node**
The user creates a new group node (a node without a linked document, acting as a category header). The API sends `POST /api/workspace/navigation` with an appropriate payload. The new group node appears in the tree.
Evidence: Network log shows POST; new node visible in tree without a document link.

**VAL-WS-017: Link document to navigation node**
The user links an existing document to a navigation node via the editor. The node's `slug` and display label update to match the linked document. The relationship is persisted via `PATCH /api/workspace/navigation/:id`.
Evidence: Network log shows PATCH; node label/slug update visible in tree.

---

### Version Management

**VAL-WS-018: Create a release version**
The user fills in a version label and slug in the Versions UI and submits. The UI sends `POST /api/workspace/versions`. On success, the new version appears in the list with `status === "draft"` and `isDefault === false`.
Evidence: Network POST; new version in list; correct initial status and isDefault values.

**VAL-WS-019: Set a version as default**
The user clicks "Set as Default" on a non-default version. The UI sends `POST /api/workspace/versions/:id/set-default`. On success, only that version shows the "Default" badge; all others lose it.
Evidence: Network POST; only one version has the Default badge; previous default badge removed.

**VAL-WS-020: Publish a version**
The user clicks "Publish" on a draft version. The UI sends `POST /api/workspace/versions/:id/publish`. On success, the version's status badge changes to "Published".
Evidence: Network POST; status badge shows "Published"; success message displayed.

---

### Asset Upload in Editor

**VAL-WS-021: Upload image via upload button**
The user clicks the image upload button in the TipTap toolbar, selects an image file (JPEG/PNG ≤ 5 MB). The file is uploaded to the backend asset endpoint. On success, a thumbnail preview of the image is inserted into the editor at the cursor position.
Evidence: Network multipart POST to asset upload endpoint; thumbnail visible in editor; Image node present in TipTap document state.

**VAL-WS-022: Copy image URL after upload**
After a successful upload, the editor UI exposes a "Copy URL" action on the inserted image node. Clicking it places the full asset URL on the clipboard.
Evidence: Clipboard contains a valid URL string pointing to the uploaded asset; URL is reachable (HTTP 200 when fetched).

**VAL-WS-023: Upload rejected for oversized file**
The user attempts to upload an image exceeding the size limit (e.g., > 10 MB). The UI shows a validation error message before or after the upload attempt; the oversized file is not stored, and no broken image node is inserted into the editor.
Evidence: Error message visible; editor document does not contain a broken image node; no partial file in asset storage.
