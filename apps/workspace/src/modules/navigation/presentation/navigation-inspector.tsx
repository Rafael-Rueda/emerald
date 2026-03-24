"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { WorkspaceNavigation } from "@emerald/contracts";
import { cn } from "@emerald/ui/lib/cn";
import {
  useCreateWorkspaceNavigationAction,
  useMoveWorkspaceNavigationAction,
  useUpdateWorkspaceNavigationAction,
  useWorkspaceNavigationDocuments,
  useWorkspaceNavigationList,
} from "../application/use-workspace-navigation";
import { useWorkspaceContext } from "../../shared/application/workspace-context";
import { AdminFeedbackState } from "../../shared/presentation/admin-feedback-state";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  TextInput,
} from "@emerald/ui/primitives";

type ActionFeedback =
  | { tone: "success"; message: string }
  | { tone: "error"; message: string }
  | null;

type CreateNodeFormState = {
  label: string;
  slug: string;
  nodeType: WorkspaceNavigation["nodeType"];
  documentId: string;
  externalUrl: string;
  underSelectedParent: boolean;
};

type EditNodeFormState = {
  label: string;
  slug: string;
  nodeType: WorkspaceNavigation["nodeType"];
  documentId: string;
  externalUrl: string;
};

function sortTreeByOrder(items: WorkspaceNavigation[]): WorkspaceNavigation[] {
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      ...item,
      children: sortTreeByOrder(item.children),
    }));
}

function slugifyLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function findNode(
  items: WorkspaceNavigation[],
  nodeId: string,
): WorkspaceNavigation | null {
  for (const item of items) {
    if (item.id === nodeId) {
      return item;
    }

    const nested = findNode(item.children, nodeId);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function findSiblings(
  items: WorkspaceNavigation[],
  parentId: string | null,
): WorkspaceNavigation[] {
  if (!parentId) {
    return items;
  }

  const parent = findNode(items, parentId);
  return parent?.children ?? [];
}

function reindexSiblings(siblings: WorkspaceNavigation[]) {
  siblings.forEach((item, index) => {
    item.order = index;
  });
}

function detachNode(
  items: WorkspaceNavigation[],
  nodeId: string,
): WorkspaceNavigation | null {
  const index = items.findIndex((item) => item.id === nodeId);
  if (index >= 0) {
    const [removed] = items.splice(index, 1);
    reindexSiblings(items);
    return removed ?? null;
  }

  for (const item of items) {
    const removed = detachNode(item.children, nodeId);
    if (removed) {
      return removed;
    }
  }

  return null;
}

function moveNodeWithinTree(
  items: WorkspaceNavigation[],
  nodeId: string,
  parentId: string | null,
  order: number,
): boolean {
  const detached = detachNode(items, nodeId);
  if (!detached) {
    return false;
  }

  const siblings = findSiblings(items, parentId);
  const targetIndex = Math.max(0, Math.min(order, siblings.length));

  detached.parentId = parentId;
  detached.order = targetIndex;

  siblings.splice(targetIndex, 0, detached);
  reindexSiblings(siblings);

  return true;
}

function updateNodeById(
  items: WorkspaceNavigation[],
  nodeId: string,
  updater: (item: WorkspaceNavigation) => WorkspaceNavigation,
): WorkspaceNavigation[] {
  return items.map((item) => {
    if (item.id === nodeId) {
      return updater(item);
    }

    if (item.children.length === 0) {
      return item;
    }

    return {
      ...item,
      children: updateNodeById(item.children, nodeId, updater),
    };
  });
}

function buildTreeSignature(items: WorkspaceNavigation[]): string {
  return items
    .map((item) =>
      [
        item.id,
        item.parentId ?? "root",
        String(item.order),
        item.updatedAt,
        buildTreeSignature(item.children),
      ].join("::"),
    )
    .join("|");
}

type SortableNavigationRowProps = {
  node: WorkspaceNavigation;
  depth: number;
  selectedNavigationId: string | null;
  collapsedNodeIds: Set<string>;
  onSelectNode: (navigationId: string) => void;
  onToggleCollapsed: (navigationId: string) => void;
  linkedDocumentTitle: string | null;
};

function SortableNavigationRow({
  node,
  depth,
  selectedNavigationId,
  collapsedNodeIds,
  onSelectNode,
  onToggleCollapsed,
  linkedDocumentTitle,
}: SortableNavigationRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.id,
    data: {
      parentId: node.parentId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSelected = selectedNavigationId === node.id;
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsedNodeIds.has(node.id);

  return (
    <li
      className="list-none"
      style={{ marginLeft: `${depth * 1.5}rem` }}
      data-testid={`navigation-node-${node.id}`}
    >
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex items-center gap-2 rounded-md border border-border bg-card px-2 py-2",
          isSelected && "border-primary bg-accent",
          isDragging && "opacity-70",
        )}
      >
        <button
          type="button"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border text-xs"
          onClick={() => onToggleCollapsed(node.id)}
          disabled={!hasChildren}
          aria-label={hasChildren ? "Toggle collapsed" : "No children"}
        >
          {hasChildren ? (isCollapsed ? "+" : "−") : "•"}
        </button>

        <button
          type="button"
          className="inline-flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded border border-border text-xs"
          aria-label={`Drag ${node.label}`}
          {...attributes}
          {...listeners}
        >
          ↕
        </button>

        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          data-testid={`navigation-select-node-${node.id}`}
          onClick={() => onSelectNode(node.id)}
        >
          <p className="truncate text-sm font-medium text-foreground">
            {node.label}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({node.nodeType === "external_link" ? "external link" : node.nodeType})
            </span>
          </p>
          <p className="text-xs text-muted-foreground" data-testid={`navigation-node-order-${node.id}`}>
            /{node.slug} • order {node.order}
          </p>
          {linkedDocumentTitle ? (
            <p className="text-xs text-emerald-600" data-testid={`navigation-node-document-title-${node.id}`}>
              Linked document: {linkedDocumentTitle}
            </p>
          ) : null}
          {node.nodeType === "external_link" && node.externalUrl ? (
            <p className="truncate text-xs text-sky-600">
              {node.externalUrl}
            </p>
          ) : null}
        </button>
      </div>
    </li>
  );
}

type NavigationTreeListProps = {
  nodes: WorkspaceNavigation[];
  depth: number;
  selectedNavigationId: string | null;
  collapsedNodeIds: Set<string>;
  onSelectNode: (navigationId: string) => void;
  onToggleCollapsed: (navigationId: string) => void;
  linkedDocumentTitleById: Map<string, string>;
};

function NavigationTreeList({
  nodes,
  depth,
  selectedNavigationId,
  collapsedNodeIds,
  onSelectNode,
  onToggleCollapsed,
  linkedDocumentTitleById,
}: NavigationTreeListProps) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <SortableContext
      items={nodes.map((node) => node.id)}
      strategy={verticalListSortingStrategy}
    >
      <ul className="space-y-2" data-testid={depth === 0 ? "navigation-tree" : undefined}>
        {nodes.map((node) => {
          const isCollapsed = collapsedNodeIds.has(node.id);

          return (
            <React.Fragment key={node.id}>
              <SortableNavigationRow
                node={node}
                depth={depth}
                selectedNavigationId={selectedNavigationId}
                collapsedNodeIds={collapsedNodeIds}
                onSelectNode={onSelectNode}
                onToggleCollapsed={onToggleCollapsed}
                linkedDocumentTitle={
                  node.documentId ? (linkedDocumentTitleById.get(node.documentId) ?? null) : null
                }
              />

              {!isCollapsed && node.children.length > 0 ? (
                <NavigationTreeList
                  nodes={node.children}
                  depth={depth + 1}
                  selectedNavigationId={selectedNavigationId}
                  collapsedNodeIds={collapsedNodeIds}
                  onSelectNode={onSelectNode}
                  onToggleCollapsed={onToggleCollapsed}
                  linkedDocumentTitleById={linkedDocumentTitleById}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </ul>
    </SortableContext>
  );
}

export function NavigationInspector() {
  const { activeSpaceId, activeSpace, activeVersionId, activeVersion } = useWorkspaceContext();
  const listState = useWorkspaceNavigationList(activeSpaceId, activeVersionId);
  const documentsState = useWorkspaceNavigationDocuments(activeSpaceId);
  const createAction = useCreateWorkspaceNavigationAction();
  const updateAction = useUpdateWorkspaceNavigationAction();
  const moveAction = useMoveWorkspaceNavigationAction();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [treeItems, setTreeItems] = useState<WorkspaceNavigation[]>([]);
  const [selectedNavigationId, setSelectedNavigationId] = useState<string | null>(
    null,
  );
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateNodeFormState>({
    label: "",
    slug: "",
    nodeType: "group",
    documentId: "",
    externalUrl: "",
    underSelectedParent: false,
  });
  const [editForm, setEditForm] = useState<EditNodeFormState>({
    label: "",
    slug: "",
    nodeType: "group",
    documentId: "",
    externalUrl: "",
  });
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>(null);

  const fetchedTreeItems =
    listState.state === "success" ? listState.data.items : null;

  const linkedDocumentTitleById = useMemo(() => {
    if (documentsState.state !== "success") {
      return new Map<string, string>();
    }

    return new Map(documentsState.data.map((doc) => [doc.id, doc.title]));
  }, [documentsState]);

  const sortedTreeItems = useMemo(() => sortTreeByOrder(treeItems), [treeItems]);
  const fetchedTreeSignature = useMemo(
    () => (fetchedTreeItems ? buildTreeSignature(fetchedTreeItems) : ""),
    [fetchedTreeItems],
  );

  useEffect(() => {
    if (!fetchedTreeItems) {
      return;
    }

    setTreeItems((currentTreeItems) => {
      if (buildTreeSignature(currentTreeItems) === fetchedTreeSignature) {
        return currentTreeItems;
      }

      return sortTreeByOrder(fetchedTreeItems);
    });
  }, [fetchedTreeItems, fetchedTreeSignature]);

  useEffect(() => {
    if (sortedTreeItems.length === 0) {
      setSelectedNavigationId(null);
      return;
    }

    const flatIds: string[] = [];
    const collectIds = (items: WorkspaceNavigation[]) => {
      for (const item of items) {
        flatIds.push(item.id);
        collectIds(item.children);
      }
    };

    collectIds(sortedTreeItems);

    setSelectedNavigationId((currentSelectedId) => {
      if (currentSelectedId && flatIds.includes(currentSelectedId)) {
        return currentSelectedId;
      }

      return sortedTreeItems[0]?.id ?? null;
    });
  }, [sortedTreeItems]);

  const selectedNode = useMemo(
    () =>
      selectedNavigationId ? findNode(sortedTreeItems, selectedNavigationId) : null,
    [selectedNavigationId, sortedTreeItems],
  );

  function openEditDialog(navigationId: string) {
    const node = findNode(sortedTreeItems, navigationId);
    if (!node) {
      return;
    }

    setSelectedNavigationId(node.id);
    setEditForm({
      label: node.label,
      slug: node.slug,
      nodeType: node.nodeType,
      documentId: node.documentId ?? "",
      externalUrl: node.externalUrl ?? "",
    });
    setActionFeedback(null);
    setIsEditDialogOpen(true);
  }

  function toggleCollapsed(navigationId: string) {
    setCollapsedNodeIds((currentSet) => {
      const nextSet = new Set(currentSet);
      if (nextSet.has(navigationId)) {
        nextSet.delete(navigationId);
      } else {
        nextSet.add(navigationId);
      }

      return nextSet;
    });
  }

  function openCreateDialog() {
    setCreateForm((current) => ({
      ...current,
      underSelectedParent: selectedNavigationId !== null,
    }));
    setActionFeedback(null);
    setIsCreateDialogOpen(true);
  }

  async function handleCreateNodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedSlug = slugifyLabel(createForm.slug || createForm.label);
    if (!normalizedSlug || !createForm.label.trim()) {
      setActionFeedback({
        tone: "error",
        message: "Label and slug are required.",
      });
      return;
    }

    if (createForm.nodeType === "document" && !createForm.documentId) {
      setActionFeedback({
        tone: "error",
        message: "A linked document is required for document nodes.",
      });
      return;
    }

    if (createForm.nodeType === "external_link" && !createForm.externalUrl.trim()) {
      setActionFeedback({
        tone: "error",
        message: "An external URL is required for external link nodes.",
      });
      return;
    }

    const parentId = createForm.underSelectedParent ? selectedNavigationId : null;
    const siblings = findSiblings(sortedTreeItems, parentId);
    const order = siblings.length;

    const result = await createAction.mutateAsync({
      spaceId: activeSpaceId!,
      releaseVersionId: activeVersionId,
      parentId,
      documentId: createForm.nodeType !== "external_link" ? (createForm.documentId || null) : null,
      label: createForm.label.trim(),
      slug: normalizedSlug,
      order,
      nodeType: createForm.nodeType,
      externalUrl: createForm.nodeType === "external_link" ? (createForm.externalUrl.trim() || null) : null,
    });

    if (result.status !== "success") {
      setActionFeedback({
        tone: "error",
        message: result.status === "not-found" ? "Node not found." : result.message,
      });
      return;
    }

    setTreeItems((currentTree) => {
      const nextTree = structuredClone(currentTree);
      const siblingsInTree = findSiblings(nextTree, parentId);
      siblingsInTree.push({ ...result.data, children: result.data.children ?? [] });
      reindexSiblings(siblingsInTree);
      return sortTreeByOrder(nextTree);
    });

    setSelectedNavigationId(result.data.id);
    setActionFeedback({
      tone: "success",
      message: "Navigation node created.",
    });
    setIsCreateDialogOpen(false);
    setCreateForm({
      label: "",
      slug: "",
      nodeType: "group",
      documentId: "",
      externalUrl: "",
      underSelectedParent: false,
    });
  }

  async function handleEditNodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedNode) {
      return;
    }

    const normalizedSlug = slugifyLabel(editForm.slug || editForm.label);
    if (!normalizedSlug || !editForm.label.trim()) {
      setActionFeedback({
        tone: "error",
        message: "Label and slug are required.",
      });
      return;
    }

    if (editForm.nodeType === "document" && !editForm.documentId) {
      setActionFeedback({
        tone: "error",
        message: "A linked document is required for document nodes.",
      });
      return;
    }

    if (editForm.nodeType === "external_link" && !editForm.externalUrl.trim()) {
      setActionFeedback({
        tone: "error",
        message: "An external URL is required for external link nodes.",
      });
      return;
    }

    const result = await updateAction.mutateAsync({
      navigationId: selectedNode.id,
      payload: {
        label: editForm.label.trim(),
        slug: normalizedSlug,
        nodeType: editForm.nodeType,
        documentId: editForm.nodeType !== "external_link" ? (editForm.documentId || null) : null,
        externalUrl: editForm.nodeType === "external_link" ? (editForm.externalUrl.trim() || null) : null,
      },
    });

    if (result.status !== "success") {
      setActionFeedback({
        tone: "error",
        message: result.status === "not-found" ? "Node not found." : result.message,
      });
      return;
    }

    setTreeItems((currentTree) =>
      updateNodeById(currentTree, selectedNode.id, (node) => ({
        ...node,
        label: result.data.label,
        slug: result.data.slug,
        nodeType: result.data.nodeType,
        documentId: result.data.documentId,
        externalUrl: result.data.externalUrl,
      })),
    );

    setActionFeedback({
      tone: "success",
      message: "Navigation node updated.",
    });
    setIsEditDialogOpen(false);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeParentId = (active.data.current?.parentId as string | null | undefined) ?? null;
    const overParentId = (over.data.current?.parentId as string | null | undefined) ?? null;

    if (activeParentId !== overParentId) {
      return;
    }

    const siblings = findSiblings(sortedTreeItems, activeParentId);
    const oldIndex = siblings.findIndex((node) => node.id === activeId);
    const newIndex = siblings.findIndex((node) => node.id === overId);

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
      return;
    }

    const previousTree = structuredClone(sortedTreeItems);
    const optimisticTree = structuredClone(sortedTreeItems);
    const moved = moveNodeWithinTree(optimisticTree, activeId, activeParentId, newIndex);

    if (!moved) {
      return;
    }

    setActionFeedback(null);
    setTreeItems(sortTreeByOrder(optimisticTree));

    const result = await moveAction.mutateAsync({
      navigationId: activeId,
      payload: {
        parentId: activeParentId,
        order: newIndex,
      },
    });

    if (result.status === "success") {
      setActionFeedback({
        tone: "success",
        message: "Navigation order updated.",
      });
      return;
    }

    setTreeItems(previousTree);
    setActionFeedback({
      tone: "error",
      message: result.status === "not-found" ? "Node not found." : result.message,
    });
  }

  async function handleMoveSelectedNodeToTop() {
    if (!selectedNode || selectedNode.order === 0) {
      return;
    }

    const parentId = selectedNode.parentId;
    const previousTree = structuredClone(sortedTreeItems);
    const optimisticTree = structuredClone(sortedTreeItems);
    const moved = moveNodeWithinTree(optimisticTree, selectedNode.id, parentId, 0);

    if (!moved) {
      return;
    }

    setActionFeedback(null);
    setTreeItems(sortTreeByOrder(optimisticTree));

    const result = await moveAction.mutateAsync({
      navigationId: selectedNode.id,
      payload: {
        parentId,
        order: 0,
      },
    });

    if (result.status === "success") {
      setActionFeedback({
        tone: "success",
        message: "Navigation order updated.",
      });
      return;
    }

    setTreeItems(previousTree);
    setActionFeedback({
      tone: "error",
      message: result.status === "not-found" ? "Node not found." : result.message,
    });
  }

  return (
    <section className="space-y-4" data-testid="admin-section-navigation">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Navigation</h1>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleMoveSelectedNodeToTop();
              }}
              disabled={!selectedNode || selectedNode.order === 0 || moveAction.isPending}
              data-testid="navigation-move-selected-to-top-button"
            >
              Move selected to top
            </Button>
            <Button type="button" onClick={openCreateDialog} data-testid="navigation-create-node-button">
              Create node
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Manage the navigation tree for the active space and version.
        </p>
      </header>

      {listState.state === "loading" && (
        <AdminFeedbackState
          testId="navigation-list-loading"
          title="Loading navigation records"
          message="Please wait while navigation data is fetched."
        />
      )}

      {listState.state === "error" && (
        <AdminFeedbackState
          testId="navigation-list-error"
          title="Could not load navigation records"
          message={listState.message}
          variant="destructive"
        />
      )}

      {listState.state === "validation-error" && (
        <AdminFeedbackState
          testId="navigation-list-validation-error"
          title="Navigation list payload is invalid"
          message={listState.message}
          variant="destructive"
        />
      )}

      {listState.state === "success" && sortedTreeItems.length === 0 && (
        <AdminFeedbackState
          testId="navigation-list-empty"
          title="No navigation records found"
          message="This workspace has no navigation records yet."
          variant="warning"
        />
      )}

      {listState.state === "success" && sortedTreeItems.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              void handleDragEnd(event);
            }}
          >
            <NavigationTreeList
              nodes={sortedTreeItems}
              depth={0}
              selectedNavigationId={selectedNavigationId}
              collapsedNodeIds={collapsedNodeIds}
              onSelectNode={openEditDialog}
              onToggleCollapsed={toggleCollapsed}
              linkedDocumentTitleById={linkedDocumentTitleById}
            />
          </DndContext>
        </div>
      )}

      {actionFeedback?.tone === "success" && (
        <p className="text-sm text-emerald-600" data-testid="navigation-action-feedback-success">
          {actionFeedback.message}
        </p>
      )}

      {actionFeedback?.tone === "error" && (
        <p className="text-sm text-destructive" data-testid="navigation-action-feedback-error">
          {actionFeedback.message}
        </p>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create navigation node</DialogTitle>
            <DialogDescription>
              Add a root node or create a child node under the selected parent.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-3" onSubmit={(event) => void handleCreateNodeSubmit(event)}>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Space</span>
              <input
                type="text"
                disabled
                value={activeSpace?.name ?? "No space selected"}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                data-testid="navigation-create-space"
              />
              <p className="text-xs text-muted-foreground">
                Controlled by the sidebar space selector.
              </p>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Version</span>
              <input
                type="text"
                disabled
                value={activeVersion ? `${activeVersion.label} (${activeVersion.key})` : "No version selected"}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                data-testid="navigation-create-version"
              />
              <p className="text-xs text-muted-foreground">
                Controlled by the sidebar version selector.
              </p>
            </label>

            <TextInput
              label="Label"
              value={createForm.label}
              onChange={(event) => {
                const label = event.target.value;
                setCreateForm((current) => ({
                  ...current,
                  label,
                  slug: current.slug.length > 0 ? current.slug : slugifyLabel(label),
                }));
              }}
            />

            <TextInput
              label="Slug"
              value={createForm.slug}
              onChange={(event) => {
                setCreateForm((current) => ({
                  ...current,
                  slug: slugifyLabel(event.target.value),
                }));
              }}
            />

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Node type</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={createForm.nodeType}
                onChange={(event) => {
                  const nodeType = event.target.value as WorkspaceNavigation["nodeType"];
                  setCreateForm((current) => ({
                    ...current,
                    nodeType,
                    documentId: nodeType === "external_link" ? "" : current.documentId,
                    externalUrl: nodeType !== "external_link" ? "" : current.externalUrl,
                  }));
                }}
              >
                <option value="group">Group</option>
                <option value="document">Document</option>
                <option value="external_link">External link</option>
              </select>
            </label>

            {createForm.nodeType !== "external_link" && (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">
                  Linked document{createForm.nodeType === "document" ? " *" : ""}
                </span>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={createForm.documentId}
                  onChange={(event) => {
                    setCreateForm((current) => ({
                      ...current,
                      documentId: event.target.value,
                    }));
                  }}
                >
                  <option value="">
                    {createForm.nodeType === "document" ? "Select a document" : "No linked document (optional)"}
                  </option>
                  {documentsState.state === "success"
                    ? documentsState.data.map((document) => (
                        <option key={document.id} value={document.id}>
                          {document.title}
                        </option>
                      ))
                    : null}
                </select>
                {createForm.nodeType === "group" && (
                  <p className="text-xs text-muted-foreground">
                    Optional. If set, clicking this group will render the linked document.
                  </p>
                )}
              </label>
            )}

            {createForm.nodeType === "external_link" && (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">External URL *</span>
                <input
                  type="url"
                  placeholder="https://example.com"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={createForm.externalUrl}
                  onChange={(event) => {
                    setCreateForm((current) => ({
                      ...current,
                      externalUrl: event.target.value,
                    }));
                  }}
                />
              </label>
            )}

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={createForm.underSelectedParent}
                disabled={!selectedNavigationId}
                onChange={(event) => {
                  setCreateForm((current) => ({
                    ...current,
                    underSelectedParent: event.target.checked,
                  }));
                }}
              />
              Create under selected parent
            </label>

            <DialogFooter>
              <Button
                type="submit"
                disabled={createAction.isPending}
                data-testid="navigation-create-submit"
              >
                {createAction.isPending ? "Creating…" : "Create node"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit navigation node</DialogTitle>
            <DialogDescription>
              Update label, slug, type, and linked document.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-3" onSubmit={(event) => void handleEditNodeSubmit(event)}>
            <TextInput
              label="Label"
              value={editForm.label}
              onChange={(event) => {
                setEditForm((current) => ({
                  ...current,
                  label: event.target.value,
                }));
              }}
            />

            <TextInput
              label="Slug"
              value={editForm.slug}
              onChange={(event) => {
                setEditForm((current) => ({
                  ...current,
                  slug: slugifyLabel(event.target.value),
                }));
              }}
            />

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Node type</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={editForm.nodeType}
                onChange={(event) => {
                  const nodeType = event.target.value as WorkspaceNavigation["nodeType"];
                  setEditForm((current) => ({
                    ...current,
                    nodeType,
                    documentId: nodeType === "external_link" ? "" : current.documentId,
                    externalUrl: nodeType !== "external_link" ? "" : current.externalUrl,
                  }));
                }}
              >
                <option value="group">Group</option>
                <option value="document">Document</option>
                <option value="external_link">External link</option>
              </select>
            </label>

            {editForm.nodeType !== "external_link" && (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">
                  Linked document{editForm.nodeType === "document" ? " *" : ""}
                </span>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editForm.documentId}
                  onChange={(event) => {
                    setEditForm((current) => ({
                      ...current,
                      documentId: event.target.value,
                    }));
                  }}
                >
                  <option value="">
                    {editForm.nodeType === "document" ? "Select a document" : "No linked document (optional)"}
                  </option>
                  {documentsState.state === "success"
                    ? documentsState.data.map((document) => (
                        <option key={document.id} value={document.id}>
                          {document.title}
                        </option>
                      ))
                    : null}
                </select>
                {editForm.nodeType === "group" && (
                  <p className="text-xs text-muted-foreground">
                    Optional. If set, clicking this group will render the linked document.
                  </p>
                )}
              </label>
            )}

            {editForm.nodeType === "external_link" && (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">External URL *</span>
                <input
                  type="url"
                  placeholder="https://example.com"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editForm.externalUrl}
                  onChange={(event) => {
                    setEditForm((current) => ({
                      ...current,
                      externalUrl: event.target.value,
                    }));
                  }}
                />
              </label>
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={updateAction.isPending}
                data-testid="navigation-edit-submit"
              >
                {updateAction.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
