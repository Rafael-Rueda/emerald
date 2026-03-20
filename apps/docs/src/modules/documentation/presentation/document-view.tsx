"use client";

import React from "react";

/**
 * DocumentView — main presentation component for public document resolution.
 *
 * Consumes the useDocument hook and renders the appropriate state:
 * - Loading: skeleton placeholder during first load
 * - Success: document title and body from the mocked fixture
 * - Not Found: explicit unavailable state
 * - Error/Validation Error: stable error state without stale content
 */

import type { DocumentIdentity } from "../domain/document-identity";
import { useDocument } from "../application/use-document";
import { DocumentLoading } from "./document-loading";
import { DocumentContent } from "./document-content";
import { DocumentUnavailable } from "./document-unavailable";
import { DocumentError } from "./document-error";

interface DocumentViewProps {
  identity: DocumentIdentity;
}

export function DocumentView({ identity }: DocumentViewProps) {
  const viewState = useDocument(identity);

  switch (viewState.state) {
    case "loading":
      return <DocumentLoading />;

    case "success":
      return <DocumentContent document={viewState.data.document} />;

    case "not-found":
      return (
        <DocumentUnavailable
          space={identity.space}
          version={identity.version}
          slug={identity.slug}
        />
      );

    case "error":
      return <DocumentError message={viewState.message} />;

    case "validation-error":
      return (
        <DocumentError
          message={viewState.message}
          isValidationError
        />
      );
  }
}
