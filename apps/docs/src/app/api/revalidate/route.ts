import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

const REVALIDATE_REQUEST_SCHEMA = z
  .object({
    path: z.string().optional(),
    paths: z.array(z.string()).optional(),
    secret: z.string().optional(),
  })
  .refine((payload) => payload.path || (payload.paths && payload.paths.length > 0), {
    message: "Provide at least one path",
    path: ["path"],
  });

function normalizePath(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed.startsWith("/")) {
    return null;
  }

  if (trimmed.includes("..")) {
    return null;
  }

  const normalized = trimmed.replace(/\/+$/, "");
  return normalized.length > 0 ? normalized : "/";
}

export async function POST(request: Request) {
  const configuredSecret =
    process.env.DOCS_REVALIDATE_SECRET?.trim() ??
    "emerald-local-revalidate-secret";

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = REVALIDATE_REQUEST_SCHEMA.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const providedSecret =
    request.headers.get("x-revalidate-secret")?.trim() ?? parsed.data.secret?.trim();

  if (!providedSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const candidatePaths = parsed.data.paths ?? (parsed.data.path ? [parsed.data.path] : []);
  const normalizedPaths = Array.from(
    new Set(candidatePaths.map(normalizePath).filter((path): path is string => Boolean(path))),
  );

  if (normalizedPaths.length === 0) {
    return NextResponse.json({ error: "No valid paths provided" }, { status: 400 });
  }

  for (const path of normalizedPaths) {
    revalidatePath(path);
  }

  return NextResponse.json({ revalidated: true, paths: normalizedPaths });
}
