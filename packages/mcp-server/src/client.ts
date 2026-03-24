export const DEFAULT_API_URL = "http://localhost:3333";

export type SearchDocumentationInput = {
  query: string;
  space: string;
  version: string;
};

export type ClientOptions = {
  apiUrl?: string;
  fetchImplementation?: typeof fetch;
};

export type SearchDocumentationClientOptions = ClientOptions;

function resolveApiUrl(apiUrl?: string): string {
  const configuredUrl = apiUrl ?? process.env.API_URL ?? DEFAULT_API_URL;
  const trimmedUrl = configuredUrl.trim();

  if (!trimmedUrl) {
    return DEFAULT_API_URL;
  }

  return trimmedUrl.replace(/\/+$/, "");
}

function buildUrl(apiUrl: string | undefined, path: string): string {
  return `${resolveApiUrl(apiUrl)}${path}`;
}

function buildSearchUrl(apiUrl?: string): string {
  return buildUrl(apiUrl, "/api/public/ai-context/search");
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

async function fetchJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  let response: Response;

  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    throw new Error(`Failed to call ${url}: ${message}`);
  }

  if (!response.ok) {
    throw new Error(`API request failed (${response.status} ${response.statusText || "Unknown status"})`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error("API returned invalid JSON response");
  }
}

export async function listSpaces(options?: ClientOptions): Promise<unknown> {
  const url = buildUrl(options?.apiUrl, "/api/public/spaces");
  const fetchImpl = options?.fetchImplementation ?? fetch;

  return fetchJson(url, fetchImpl);
}

export async function listVersions(
  spaceKey: string,
  options?: ClientOptions,
): Promise<unknown> {
  const url = buildUrl(options?.apiUrl, `/api/public/spaces/${encodeURIComponent(spaceKey)}/versions`);
  const fetchImpl = options?.fetchImplementation ?? fetch;

  return fetchJson(url, fetchImpl);
}
