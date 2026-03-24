import { resolveWorkspaceApiUrl, WORKSPACE_AUTH_CLIENT_COOKIE_NAME } from "../../shared/auth/workspace-auth";

const WORKSPACE_AUTH_COOKIE = WORKSPACE_AUTH_CLIENT_COOKIE_NAME;

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  roles: string[];
  avatarUrl: string | null;
}

export type UserFetchResult =
  | { status: "success"; data: UserResponse }
  | { status: "error"; message: string }
  | { status: "not-found" };

export type UserListFetchResult =
  | { status: "success"; data: UserResponse[] }
  | { status: "error"; message: string };

function readAuthToken(): string | null {
  if (typeof document === "undefined") return null;

  for (const cookie of document.cookie.split(";")) {
    const [name, ...rest] = cookie.trim().split("=");
    if (name === WORKSPACE_AUTH_COOKIE) {
      const value = rest.join("=");
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }

  return null;
}

function authHeaders(): Record<string, string> {
  const token = readAuthToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function apiUrl(path: string): string {
  return `${resolveWorkspaceApiUrl()}${path}`;
}

export async function fetchWorkspaceUsers(): Promise<UserListFetchResult> {
  try {
    const response = await fetch(apiUrl("/users?limit=100"), {
      headers: authHeaders(),
    });

    if (!response.ok) {
      return { status: "error", message: `Request failed with status ${response.status}` };
    }

    const data = await response.json();
    return { status: "success", data: data.users ?? [] };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Network error" };
  }
}

export async function createWorkspaceUser(payload: {
  username: string;
  email: string;
  password: string;
}): Promise<UserFetchResult> {
  try {
    const response = await fetch(apiUrl("/users"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.message ?? `Request failed with status ${response.status}`;
      return { status: "error", message: typeof message === "string" ? message : String(message) };
    }

    const data = await response.json();
    return { status: "success", data: data.user };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Network error" };
  }
}

export async function updateWorkspaceUser(
  userId: string,
  payload: {
    username?: string;
    email?: string;
    password?: string;
    roles?: string[];
  },
): Promise<UserFetchResult> {
  try {
    const response = await fetch(apiUrl(`/users/${encodeURIComponent(userId)}`), {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.message ?? `Request failed with status ${response.status}`;
      return { status: "error", message: typeof message === "string" ? message : String(message) };
    }

    const data = await response.json();
    return { status: "success", data: data.user };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Network error" };
  }
}

export async function deleteWorkspaceUser(userId: string): Promise<UserFetchResult> {
  try {
    const response = await fetch(apiUrl(`/users/${encodeURIComponent(userId)}`), {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.message ?? `Request failed with status ${response.status}`;
      return { status: "error", message: typeof message === "string" ? message : String(message) };
    }

    const data = await response.json();
    return { status: "success", data: data.user };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Network error" };
  }
}
