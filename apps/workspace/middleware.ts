import { NextResponse, type NextRequest } from "next/server";

const ADMIN_PREFIX = "/admin";
const LOGIN_PATH = "/admin/login";
const AUTH_COOKIE_KEYS = ["workspace_access_token", "accessToken", "token"] as const;

function getTokenFromRequest(request: NextRequest): string | null {
  const authorizationHeader = request.headers.get("authorization");

  if (authorizationHeader?.startsWith("Bearer ")) {
    const token = authorizationHeader.slice("Bearer ".length).trim();
    if (token) return token;
  }

  for (const cookieKey of AUTH_COOKIE_KEYS) {
    const cookieToken = request.cookies.get(cookieKey)?.value;
    if (cookieToken) return cookieToken;
  }

  return null;
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

function isUsableToken(token: string): boolean {
  const payload = decodeJwtPayload(token);

  if (!payload) return false;
  if (typeof payload.exp !== "number") return true;

  return payload.exp * 1000 > Date.now();
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith(ADMIN_PREFIX) || pathname.startsWith(LOGIN_PATH)) {
    return NextResponse.next();
  }

  const token = getTokenFromRequest(request);
  if (token && isUsableToken(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set("redirect", pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
