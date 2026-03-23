export const DEFAULT_API_URL = "http://localhost:3333";

export type SearchDocumentationInput = {
  query: string;
  space: string;
  version: string;
};

export type SearchDocumentationClientOptions = {
  apiUrl?: string;
  fetchImplementation?: typeof fetch;
};

function resolveApiUrl(apiUrl?: string): string {
  const configuredUrl = apiUrl ?? process.env.API_URL ?? DEFAULT_API_URL;
  const trimmedUrl = configuredUrl.trim();

  if (!trimmedUrl) {
    return DEFAULT_API_URL;
  }

  return trimmedUrl.replace(/\/+$/, "");
}

function buildSearchUrl(apiUrl?: string): string {
  return `${resolveApiUrl(apiUrl)}/api/public/ai-context/search`;
}

export async function searchDocumentation(
  input: SearchDocumentationInput,
  options?: SearchDocumentationClientOptions,
): Promise<unknown> {
  const searchUrl = buildSearchUrl(options?.apiUrl);
  const fetchImplementation = options?.fetchImplementation ?? fetch;

  let response: Response;

  try {
    response = await fetchImplementation(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    throw new Error(`Failed to call ${searchUrl}: ${message}`);
  }

  if (!response.ok) {
    throw new Error(
      `Semantic search API request failed (${response.status} ${response.statusText || "Unknown status"})`,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new Error("Semantic search API returned invalid JSON response");
  }
}
