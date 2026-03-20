"use client";

import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@emerald/ui";

/**
 * DocumentUnavailable — shown when the requested document does not exist.
 *
 * Renders an explicit not-found state instead of stale content or a blank shell.
 */
interface DocumentUnavailableProps {
  space: string;
  version: string;
  slug: string;
}

export function DocumentUnavailable({
  space,
  version,
  slug,
}: DocumentUnavailableProps) {
  return (
    <div
      className="max-w-3xl"
      data-testid="document-unavailable"
    >
      <Alert variant="warning">
        <AlertTitle>Document unavailable</AlertTitle>
        <AlertDescription>
          The document <strong>{slug}</strong> could not be found in{" "}
          <strong>{space}/{version}</strong>. It may have been moved or removed.
        </AlertDescription>
      </Alert>
    </div>
  );
}
