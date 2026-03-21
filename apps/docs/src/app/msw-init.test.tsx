import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const workerStartMock = vi.fn(async () => undefined);

vi.mock("@emerald/mocks/browser", () => ({
  createMswWorker: () => ({
    start: workerStartMock,
  }),
}));

describe("Docs MswInit", () => {
  beforeEach(() => {
    vi.resetModules();
    workerStartMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as Window & { __EMERALD_USE_MSW_FALLBACK__?: boolean })
      .__EMERALD_USE_MSW_FALLBACK__;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("skips MSW startup when API health check is successful", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3333";

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);
    const timeoutSpy = vi.spyOn(window, "setTimeout");

    const { MswInit } = await import("./msw-init");

    render(
      <MswInit>
        <div>docs-ready</div>
      </MswInit>,
    );

    await screen.findByText("docs-ready");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3333/health",
      expect.objectContaining({ method: "GET" }),
    );
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1_500);
    expect(workerStartMock).not.toHaveBeenCalled();
    expect(
      (window as Window & { __EMERALD_USE_MSW_FALLBACK__?: boolean })
        .__EMERALD_USE_MSW_FALLBACK__,
    ).toBe(false);
  });

  it("starts MSW when API health check fails", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3333";

    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    const { MswInit } = await import("./msw-init");

    render(
      <MswInit>
        <div>docs-ready</div>
      </MswInit>,
    );

    await screen.findByText("docs-ready");
    await waitFor(() => {
      expect(workerStartMock).toHaveBeenCalledWith({
        onUnhandledRequest: "bypass",
      });
    });
    expect(
      (window as Window & { __EMERALD_USE_MSW_FALLBACK__?: boolean })
        .__EMERALD_USE_MSW_FALLBACK__,
    ).toBe(true);
  });

  it("starts MSW immediately when NEXT_PUBLIC_API_URL is not configured", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const { MswInit } = await import("./msw-init");

    render(
      <MswInit>
        <div>docs-ready</div>
      </MswInit>,
    );

    await screen.findByText("docs-ready");
    await waitFor(() => {
      expect(workerStartMock).toHaveBeenCalledWith({
        onUnhandledRequest: "bypass",
      });
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      (window as Window & { __EMERALD_USE_MSW_FALLBACK__?: boolean })
        .__EMERALD_USE_MSW_FALLBACK__,
    ).toBe(true);
  });
});
