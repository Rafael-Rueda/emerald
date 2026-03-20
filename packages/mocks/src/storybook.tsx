import React, { useEffect, useState } from "react";
import type { ScenarioConfig } from "./scenarios";
import type { RequestHandler } from "msw";
import { createAllHandlers } from "./handlers";

/**
 * Storybook MSW integration.
 *
 * This module provides a decorator and utilities for stories to opt into
 * MSW-backed mocked data. Stories can configure per-scenario overrides.
 *
 * Usage in a story:
 * ```tsx
 * import { withMsw } from "@emerald/mocks/storybook";
 *
 * export default {
 *   title: "Features/DocumentViewer",
 *   decorators: [withMsw({ document: "success" })],
 * };
 * ```
 *
 * The MSW worker is initialized lazily and reused across stories.
 * When switching between stories with different scenario configs,
 * handlers are reset and reapplied automatically.
 */

type MswWorkerType = {
  start: (options?: { onUnhandledRequest?: string }) => Promise<unknown>;
  stop: () => void;
  resetHandlers: (...handlers: RequestHandler[]) => void;
  use: (...handlers: RequestHandler[]) => void;
};

let workerPromise: Promise<MswWorkerType> | null = null;

async function getOrCreateWorker(): Promise<MswWorkerType> {
  if (workerPromise) return workerPromise;

  workerPromise = (async () => {
    // Dynamic import to avoid bundling msw/browser in non-browser contexts
    const { createMswWorker } = await import("./browser");
    const worker = createMswWorker();
    await worker.start({ onUnhandledRequest: "bypass" });
    return worker as unknown as MswWorkerType;
  })();

  return workerPromise;
}

interface MswWrapperProps {
  config: ScenarioConfig;
  children: React.ReactNode;
}

function MswWrapper({ config, children }: MswWrapperProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getOrCreateWorker().then((worker) => {
      if (cancelled) return;
      // Reapply handlers for the current story's scenario config.
      // resetHandlers replaces all runtime handlers with the new set,
      // so each story gets a clean slate matching its config.
      const handlers = createAllHandlers(config);
      worker.resetHandlers(...handlers);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [config]);

  if (!ready) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          color: "#888",
        }}
      >
        Initializing MSW…
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Storybook decorator that initializes MSW with the given scenario config.
 * Handlers are reapplied when the scenario config changes between stories.
 *
 * @example
 * ```ts
 * decorators: [withMsw({ document: "error" })]
 * ```
 */
export function withMsw(config: ScenarioConfig = {}) {
  return function MswDecorator(Story: React.ComponentType) {
    return (
      <MswWrapper config={config}>
        <Story />
      </MswWrapper>
    );
  };
}
