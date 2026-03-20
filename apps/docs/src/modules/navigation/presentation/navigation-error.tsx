"use client";

import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@emerald/ui";

interface NavigationErrorProps {
  message?: string;
  isValidationError?: boolean;
}

/**
 * NavigationError — shown when navigation data fails to load or is malformed.
 */
export function NavigationError({
  message: _message,
  isValidationError = false,
}: NavigationErrorProps) {
  return (
    <div data-testid="navigation-error">
      <Alert variant="destructive">
        <AlertTitle>
          {isValidationError
            ? "Invalid navigation data"
            : "Failed to load navigation"}
        </AlertTitle>
        <AlertDescription>
          {isValidationError
            ? "The navigation data received is invalid and cannot be displayed safely."
            : "Something went wrong while loading the navigation. Please try again later."}
        </AlertDescription>
      </Alert>
    </div>
  );
}
