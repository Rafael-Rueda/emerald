import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractBearerToken,
  getJwtRemainingSeconds,
  isJwtTokenValid,
  resolveWorkspaceApiUrl,
} from "./workspace-auth";

function createUnsignedToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
    "base64url",
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${encodedPayload}.signature`;
}

describe("workspace-auth", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.useRealTimers();
  });

  it("extracts bearer tokens from authorization headers", () => {
    expect(extractBearerToken("Bearer token-123")).toBe("token-123");
    expect(extractBearerToken("Basic token-123")).toBeNull();
    expect(extractBearerToken(null)).toBeNull();
  });

  it("validates non-expired JWT payloads", () => {
    const nowSeconds = 1_700_000_000;
    const token = createUnsignedToken({ sub: "user-id", exp: nowSeconds + 60 });

    expect(isJwtTokenValid(token, nowSeconds)).toBe(true);
  });

  it("rejects expired or malformed tokens", () => {
    const nowSeconds = 1_700_000_000;
    const expiredToken = createUnsignedToken({ sub: "user-id", exp: nowSeconds - 1 });

    expect(isJwtTokenValid(expiredToken, nowSeconds)).toBe(false);
    expect(isJwtTokenValid("invalid.token", nowSeconds)).toBe(false);
  });

  it("returns remaining lifetime in seconds when token is not expired", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const nowSeconds = Math.floor(Date.now() / 1000);
    const token = createUnsignedToken({ exp: nowSeconds + 120 });

    expect(getJwtRemainingSeconds(token)).toBe(120);
  });

  it("normalizes NEXT_PUBLIC_API_URL from environment", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3333///";

    expect(resolveWorkspaceApiUrl()).toBe("http://localhost:3333");
  });
});
