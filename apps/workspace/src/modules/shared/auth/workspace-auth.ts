const BEARER_PREFIX = "Bearer ";

export const WORKSPACE_AUTH_COOKIE_NAME = "emerald_workspace_auth_token";
export const WORKSPACE_AUTH_CLIENT_COOKIE_NAME =
  "emerald_workspace_auth_token_client";

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  if (!authorizationHeader.startsWith(BEARER_PREFIX)) {
    return null;
  }

  const token = authorizationHeader.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

export function readJwtPayload(token: string): Record<string, unknown> | null {
  const segments = token.split(".");
  if (segments.length !== 3) {
    return null;
  }

  try {
    const payload = decodeBase64Url(segments[1]);
    const json = JSON.parse(payload) as unknown;
    return typeof json === "object" && json !== null
      ? (json as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function isJwtTokenValid(
  token: string,
  currentTimeInSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const payload = readJwtPayload(token);
  if (!payload) {
    return false;
  }

  const expiresAt = payload.exp;

  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) {
    return false;
  }

  return expiresAt > currentTimeInSeconds;
}

export function getJwtRemainingSeconds(token: string): number | null {
  const payload = readJwtPayload(token);
  if (!payload) {
    return null;
  }

  const expiresAt = payload.exp;
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) {
    return null;
  }

  const remainingSeconds = Math.floor(expiresAt - Date.now() / 1000);
  return remainingSeconds > 0 ? remainingSeconds : null;
}

export function resolveWorkspaceApiUrl(): string {
  const resolved = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  return resolved.replace(/\/+$/, "");
}
