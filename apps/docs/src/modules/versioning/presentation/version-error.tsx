"use client";

import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@emerald/ui";

interface VersionErrorProps {
  isValidationError?: boolean;
}

/**
 * VersionError — shown when version metadata fails to load or validate.
 */
export function VersionError({
  isValidationError = false,
}: VersionErrorProps) {
  return (
    <div className="max-w-3xl" data-testid="version-error">
      <Alert variant="destructive">
        <AlertTitle>
          {isValidationError
            ? "Invalid version metadata"
            : "Failed to load versions"}
        </AlertTitle>
        <AlertDescription>
          {isValidationError
            ? "The version metadata received from the server is invalid and cannot be displayed safely."
            : "Something went wrong while loading available versions for this space."}
        </AlertDescription>
      </Alert>
    </div>
  );
}
