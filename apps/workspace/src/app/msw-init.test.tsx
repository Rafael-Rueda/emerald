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

describe("MswInit", () => {
  beforeEach(() => {
    vi.resetModules();
    workerStartMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("skips MSW startup when API health check is successful", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3333";
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const { MswInit } = await import("./msw-init");

    render(
      <MswInit>
        <div>workspace-ready</div>
      </MswInit>,
    );

    await screen.findByText("workspace-ready");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3333/health",
      expect.objectContaining({ method: "GET" }),
    );
    expect(workerStartMock).not.toHaveBeenCalled();
  });

  it("starts MSW when API health check fails", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3333";
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));

    vi.stubGlobal("fetch", fetchMock);

    const { MswInit } = await import("./msw-init");

    render(
      <MswInit>
        <div>workspace-ready</div>
      </MswInit>,
    );

    await screen.findByText("workspace-ready");
    await waitFor(() => {
      expect(workerStartMock).toHaveBeenCalledWith({
        onUnhandledRequest: "bypass",
      });
    });
  });
});
