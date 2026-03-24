"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DocumentContentSchema, type DocumentContent } from "@emerald/contracts";
import type { JSONContent } from "@tiptap/core";
import { toDocumentContent } from "../../editor";

type AutosaveState = "idle" | "saving" | "saved" | "save-failed" | "validation-error";

export interface DocumentAutosaveResult {
  status: AutosaveState;
  message: string | null;
  isDirty: boolean;
  lastSavedAt: Date | null;
}

export interface UseDocumentAutosaveOptions {
  documentId: string | null;
  editorJson: JSONContent | null;
  saveRevision: (payload: {
    documentId: string;
    content_json: DocumentContent;
  }) => Promise<{ status: "success" } | { status: "error" | "validation-error"; message: string }>;
  debounceMs?: number;
}

export function useDocumentAutosave({
  documentId,
  editorJson,
  saveRevision,
  debounceMs = 2000,
}: UseDocumentAutosaveOptions): DocumentAutosaveResult {
  const [status, setStatus] = useState<AutosaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const lastSavedSerializedRef = useRef<string | null>(null);
  const currentDocumentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!documentId || !editorJson) {
      setIsDirty(false);
      setStatus("idle");
      setMessage(null);
      lastSavedSerializedRef.current = null;
      currentDocumentIdRef.current = documentId;
      return;
    }

    const serialized = JSON.stringify(editorJson);
    if (currentDocumentIdRef.current !== documentId || lastSavedSerializedRef.current === null) {
      currentDocumentIdRef.current = documentId;
      lastSavedSerializedRef.current = serialized;
      setIsDirty(false);
      setStatus("saved");
      setMessage(null);
      return;
    }

    if (lastSavedSerializedRef.current === serialized) {
      setIsDirty(false);
      return;
    }

    setIsDirty(true);
    setMessage(null);

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      const mappedContent = toDocumentContent(editorJson);
      const parsedContent = DocumentContentSchema.safeParse(mappedContent);

      if (!parsedContent.success) {
        if (cancelled) {
          return;
        }

        setStatus("validation-error");
        setMessage("Editor content is invalid and could not be saved.");
        return;
      }

      setStatus("saving");

      const saveResult = await saveRevision({
        documentId,
        content_json: parsedContent.data,
      });

      if (cancelled) {
        return;
      }

      if (saveResult.status === "success") {
        lastSavedSerializedRef.current = serialized;
        setIsDirty(false);
        setStatus("saved");
        setLastSavedAt(new Date());
        setMessage(null);
        return;
      }

      setStatus("save-failed");
      setMessage(saveResult.message);
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [debounceMs, documentId, editorJson, saveRevision]);

  return useMemo(
    () => ({
      status,
      message,
      isDirty,
      lastSavedAt,
    }),
    [isDirty, message, status, lastSavedAt],
  );
}
