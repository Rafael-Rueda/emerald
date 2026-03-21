/**
 * Document API client — infrastructure layer.
 *
 * Fetches document data from the public API endpoint (or MSW fallback)
 * and validates the response with Zod at the boundary.
 */

import { DocumentResponseSchema, type DocumentResponse } from "@emerald/contracts";
import { z } from "zod";
import type { DocumentIdentity } from "../domain/document-identity";
import { buildDocumentApiPath } from "../domain/document-identity";

/** Result type for document fetch operations. */
export type DocumentFetchResult =
  | { status: "success"; data: DocumentResponse }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "validation-error"; message: string };

const PublicDocumentResponseSchema = z.object({
  document: z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    space: z.string(),
    version: z.string(),
    rendered_html: z.string(),
    updatedAt: z.string(),
  }),
});

function shouldUseMswFallback(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(
    (window as Window & { __EMERALD_USE_MSW_FALLBACK__?: boolean })
      .__EMERALD_USE_MSW_FALLBACK__,
  );
}

function resolveDocumentRequest(identity: DocumentIdentity): {
  requestUrl: string;
  usesPublicApi: boolean;
} {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!apiBaseUrl || shouldUseMswFallback()) {
    return {
      requestUrl: buildDocumentApiPath(identity),
      usesPublicApi: false,
    };
  }

  const path = `/api/public/spaces/${encodeURIComponent(identity.space)}/versions/${encodeURIComponent(identity.version)}/documents/${encodeURIComponent(identity.slug)}`;
  return {
    requestUrl: `${apiBaseUrl}${path}`,
    usesPublicApi: true,
  };
}

function extractHeadingsFromHtml(html: string) {
  const headingRegex = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;
  const headings: DocumentResponse["document"]["headings"] = [];

  let match = headingRegex.exec(html);
  while (match) {
    const [, levelRaw, attributes, content] = match;
    const level = Number(levelRaw);
    const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const idMatch = /\sid=["']([^"']+)["']/i.exec(attributes);
    const fallbackId = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    if (text.length > 0) {
      headings.push({
        id: idMatch?.[1] ?? fallbackId,
        text,
        level,
      });
    }

    match = headingRegex.exec(html);
  }

  return headings;
}

function normalizeDocumentResponse(
  payload: unknown,
  usesPublicApi: boolean,
): DocumentFetchResult {
  if (!usesPublicApi) {
    const parsed = DocumentResponseSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        status: "validation-error",
        message: `Invalid document response: ${parsed.error.message}`,
      };
    }

    return { status: "success", data: parsed.data };
  }

  const parsedPublic = PublicDocumentResponseSchema.safeParse(payload);
  if (!parsedPublic.success) {
    return {
      status: "validation-error",
      message: `Invalid document response: ${parsedPublic.error.message}`,
    };
  }

  const adapted = {
    document: {
      id: parsedPublic.data.document.id,
      title: parsedPublic.data.document.title,
      slug: parsedPublic.data.document.slug,
      space: parsedPublic.data.document.space,
      version: parsedPublic.data.document.version,
      body: parsedPublic.data.document.rendered_html,
      headings: extractHeadingsFromHtml(parsedPublic.data.document.rendered_html),
      updatedAt: parsedPublic.data.document.updatedAt,
    },
  };

  const parsed = DocumentResponseSchema.safeParse(adapted);
  if (!parsed.success) {
    return {
      status: "validation-error",
      message: `Invalid document response: ${parsed.error.message}`,
    };
  }

  return { status: "success", data: parsed.data };
}

/**
 * Fetch a document by its identity from the API.
 *
 * - On success (200 + valid schema): returns the validated document response.
 * - On 404: returns a not-found result.
 * - On other HTTP errors: returns an error result.
 * - On schema validation failure: returns a validation-error result
 *   so malformed payloads are never rendered as trusted content.
 */
export async function fetchDocument(
  identity: DocumentIdentity,
): Promise<DocumentFetchResult> {
  const { requestUrl, usesPublicApi } = resolveDocumentRequest(identity);

  let response: Response;
  try {
    response = await fetch(requestUrl);
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Network error",
    };
  }

  if (response.status === 404) {
    return { status: "not-found" };
  }

  if (!response.ok) {
    return {
      status: "error",
      message: `Request failed with status ${response.status}`,
    };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return {
      status: "validation-error",
      message: "Failed to parse response as JSON",
    };
  }

  return normalizeDocumentResponse(json, usesPublicApi);
}
