"use client";

import React from "react";
import { useEffect, useState } from "react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

async function shouldUseRealApi(): Promise<boolean> {
  if (!API_BASE_URL) {
    return false;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 1_500);

  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Client component that lazily initializes MSW in the browser.
 *
 * This is the recommended pattern for Next.js App Router:
 * - Dynamic import ensures `msw/browser` is only loaded client-side
 * - The component renders children only after MSW is ready
 * - Unhandled requests are bypassed so static assets, Next.js chunks,
 *   and other non-API requests are not blocked
 */
export function MswInit({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      if (typeof window === "undefined") return;

      try {
        const useRealApi = await shouldUseRealApi();
        if (!useRealApi) {
          const { createMswWorker } = await import("@emerald/mocks/browser");
          const worker = createMswWorker();
          await worker.start({ onUnhandledRequest: "bypass" });
        }
      } finally {
        setReady(true);
      }
    }

    init();
  }, []);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
