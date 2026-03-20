"use client";

import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@emerald/ui";

/**
 * DocumentError — shown when the document request fails or returns invalid data.
 *
 * Renders a stable error state so stale content is never shown as current.
 */
interface DocumentErrorProps {
  message: string;
  /** Whether this is a schema/validation error vs a request error. */
  isValidationError?: boolean;
}

export function DocumentError({
  message: _message,
  isValidationError = false,
}: DocumentErrorProps) {
  return (
    <div
      className="max-w-3xl"
      data-testid="document-error"
    >
      <Alert variant="destructive">
        <AlertTitle>
          {isValidationError
            ? "Invalid document data"
            : "Failed to load document"}
        </AlertTitle>
        <AlertDescription>
          {isValidationError
            ? "The document data received from the server is invalid and cannot be displayed safely."
            : "Something went wrong while loading this document. Please try again later."}
        </AlertDescription>
      </Alert>
    </div>
  );
}
