import React from "react";
import type { WorkspaceDocument } from "@emerald/contracts";
import { cn } from "@emerald/ui/lib/cn";

type DocumentStatus = WorkspaceDocument["status"];

const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

const DOCUMENT_STATUS_STYLES: Record<DocumentStatus, string> = {
  draft: "border-amber-300 bg-amber-50 text-amber-700",
  published: "border-emerald-300 bg-emerald-50 text-emerald-700",
  archived: "border-slate-300 bg-slate-100 text-slate-700",
};

export function getDocumentStatusLabel(status: DocumentStatus): string {
  return DOCUMENT_STATUS_LABELS[status];
}

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  testId?: string;
}

export function DocumentStatusBadge({ status, testId }: DocumentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        DOCUMENT_STATUS_STYLES[status],
      )}
      data-testid={testId}
    >
      {getDocumentStatusLabel(status)}
    </span>
  );
}
