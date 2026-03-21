import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getJwtRemainingSeconds,
  resolveWorkspaceApiUrl,
  WORKSPACE_AUTH_CLIENT_COOKIE_NAME,
  WORKSPACE_AUTH_COOKIE_NAME,
} from "../../../../modules/shared/auth/workspace-auth";

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
});

function resolveErrorMessage(payload: unknown, status: number): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return `Request failed with status ${status}`;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsedBody = LoginRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ message: "Invalid login payload" }, { status: 400 });
  }

  const apiBaseUrl = resolveWorkspaceApiUrl();
  if (!apiBaseUrl) {
    return NextResponse.json(
      { message: "NEXT_PUBLIC_API_URL is not configured" },
      { status: 500 },
    );
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedBody.data),
      cache: "no-store",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to reach auth service",
      },
      { status: 502 },
    );
  }

  let payload: unknown = null;
  try {
    payload = await upstreamResponse.json();
  } catch {
    payload = null;
  }

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      { message: resolveErrorMessage(payload, upstreamResponse.status) },
      { status: upstreamResponse.status },
    );
  }

  const parsedResponse = LoginResponseSchema.safeParse(payload);
  if (!parsedResponse.success) {
    return NextResponse.json(
      { message: "Invalid auth response payload" },
      { status: 502 },
    );
  }

  const response = NextResponse.json({ success: true });
  const maxAge = getJwtRemainingSeconds(parsedResponse.data.accessToken);

  response.cookies.set({
    name: WORKSPACE_AUTH_COOKIE_NAME,
    value: parsedResponse.data.accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(maxAge ? { maxAge } : {}),
  });

  response.cookies.set({
    name: WORKSPACE_AUTH_CLIENT_COOKIE_NAME,
    value: parsedResponse.data.accessToken,
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(maxAge ? { maxAge } : {}),
  });

  return response;
}
