"use client";

import { useEffect, useState } from "react";

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

      const { createMswWorker } = await import("@emerald/mocks/browser");
      const worker = createMswWorker();
      await worker.start({ onUnhandledRequest: "bypass" });
      setReady(true);
    }

    init();
  }, []);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
