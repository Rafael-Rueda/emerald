import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  extractBearerToken,
  isJwtTokenValid,
  WORKSPACE_AUTH_COOKIE_NAME,
} from "./modules/shared/auth/workspace-auth";

function resolveRequestToken(request: NextRequest): string | null {
  const tokenFromHeader = extractBearerToken(request.headers.get("authorization"));
  if (tokenFromHeader) {
    return tokenFromHeader;
  }

  return request.cookies.get(WORKSPACE_AUTH_COOKIE_NAME)?.value ?? null;
}

function isLoginRoute(pathname: string): boolean {
  return pathname === "/admin/login";
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = resolveRequestToken(request);
  const isAuthenticated = typeof token === "string" && isJwtTokenValid(token);

  if (isLoginRoute(pathname)) {
    if (!isAuthenticated) {
      return NextResponse.next();
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/documents";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthenticated) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
