"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

function resolveNextPath(nextValue: string | null): string {
  if (!nextValue || !nextValue.startsWith("/admin")) {
    return "/admin/documents";
  }

  return nextValue;
}

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const redirectPath = useMemo(
    () => resolveNextPath(searchParams.get("next")),
    [searchParams],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        const message =
          typeof payload === "object" &&
          payload !== null &&
          "message" in payload &&
          typeof payload.message === "string"
            ? payload.message
            : `Login failed with status ${response.status}`;

        setErrorMessage(message);
        return;
      }

      window.location.href = redirectPath;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unexpected authentication error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center px-6">
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="w-full space-y-4 rounded-lg border border-border bg-card p-6"
      >
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Workspace login</h1>
          <p className="text-sm text-muted-foreground">
            Authenticate to access <code>/admin</code> routes.
          </p>
        </header>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            autoComplete="email"
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            autoComplete="current-password"
            required
          />
        </label>

        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
