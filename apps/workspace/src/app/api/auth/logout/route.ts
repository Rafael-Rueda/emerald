import { NextResponse } from "next/server";
import {
  WORKSPACE_AUTH_COOKIE_NAME,
  WORKSPACE_AUTH_CLIENT_COOKIE_NAME,
} from "../../../../modules/shared/auth/workspace-auth";

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set({
    name: WORKSPACE_AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set({
    name: WORKSPACE_AUTH_CLIENT_COOKIE_NAME,
    value: "",
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
