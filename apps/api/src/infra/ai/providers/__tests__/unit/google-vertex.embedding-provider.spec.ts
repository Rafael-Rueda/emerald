import type { ConfigService } from "@nestjs/config";

import { EmbeddingProviderError } from "@/domain/ai-context/application/providers/embedding-provider.error";
import type { Env } from "@/env/env";

// --- Mock google-auth-library --------------------------------------------
const getAccessTokenMock = jest.fn();
const getClientMock = jest.fn();

jest.mock("google-auth-library", () => {
    const GoogleAuthMock = jest.fn().mockImplementation(() => ({
        getClient: getClientMock,
    }));
    return {
        __esModule: true,
        GoogleAuth: GoogleAuthMock,
    };
});

// Import AFTER mock registration so the provider picks up the mocked auth lib.

const { GoogleVertexEmbeddingProvider } =
    require("../../google-vertex.embedding-provider") as typeof import("../../google-vertex.embedding-provider");

const GoogleAuthConstructorMock = require("google-auth-library").GoogleAuth as jest.Mock;

// --- Helpers --------------------------------------------------------------
type EnvValues = {
    GOOGLE_PROJECT_ID: string | undefined;
    GOOGLE_APPLICATION_CREDENTIALS: string | undefined;
    GOOGLE_VERTEX_LOCATION: string;
    GOOGLE_EMBEDDING_MODEL: string;
    EMBEDDING_DIMENSION: number;
};

const makeConfigService = (overrides: Partial<EnvValues> = {}): ConfigService<Env, true> => {
    const values: EnvValues = {
        GOOGLE_PROJECT_ID: "test-project",
        GOOGLE_APPLICATION_CREDENTIALS: "/tmp/fake-key.json",
        GOOGLE_VERTEX_LOCATION: "us-central1",
        GOOGLE_EMBEDDING_MODEL: "text-embedding-004",
        EMBEDDING_DIMENSION: 768,
        ...overrides,
    };

    return {
        get: jest.fn((key: keyof EnvValues) => values[key]),
    } as unknown as ConfigService<Env, true>;
};

const makeFetchResponse = (body: unknown, init: { ok?: boolean; status?: number } = {}): Response => {
    const { ok = true, status = 200 } = init;
    return {
        ok,
        status,
        text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
        json: () => Promise.resolve(body),
    } as unknown as Response;
};

// --- Tests ----------------------------------------------------------------
describe("GoogleVertexEmbeddingProvider", () => {
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
        getAccessTokenMock.mockReset();
        getClientMock.mockReset();
        GoogleAuthConstructorMock.mockClear();

        getAccessTokenMock.mockResolvedValue({ token: "fake-token" });
        getClientMock.mockResolvedValue({ getAccessToken: getAccessTokenMock });

        fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() => {
            throw new Error("fetch mock not configured for this test");
        });
    });

    afterEach(() => {
        fetchSpy.mockRestore();
    });

    describe("construction", () => {
        it("builds GoogleAuth with keyFile and cloud-platform scope, and exposes dimension from env", () => {
            const cfg = makeConfigService({ EMBEDDING_DIMENSION: 512 });

            const provider = new GoogleVertexEmbeddingProvider(cfg);

            expect(GoogleAuthConstructorMock).toHaveBeenCalledWith({
                keyFile: "/tmp/fake-key.json",
                scopes: ["https://www.googleapis.com/auth/cloud-platform"],
            });
            expect(provider.name).toBe("google");
            expect(provider.dimension).toBe(512);
        });
    });

    describe("embed()", () => {
        it("returns [] for an empty input without calling fetch or auth", async () => {
            const provider = new GoogleVertexEmbeddingProvider(makeConfigService());

            const result = await provider.embed([], { inputType: "query" });

            expect(result).toEqual([]);
            expect(fetchSpy).not.toHaveBeenCalled();
            expect(getClientMock).not.toHaveBeenCalled();
        });

        it("POSTs to the correct Vertex URL with Authorization header and RETRIEVAL_DOCUMENT task_type", async () => {
            const provider = new GoogleVertexEmbeddingProvider(makeConfigService({ EMBEDDING_DIMENSION: 768 }));

            fetchSpy.mockResolvedValueOnce(
                makeFetchResponse({
                    predictions: [{ embeddings: { values: [0.1, 0.2, 0.3] } }],
                }),
            );

            await provider.embed(["hello world"], { inputType: "document" });

            expect(fetchSpy).toHaveBeenCalledTimes(1);

            const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];

            expect(url).toBe(
                "https://us-central1-aiplatform.googleapis.com/v1/projects/test-project/locations/us-central1/publishers/google/models/text-embedding-004:predict",
            );

            expect(init.method).toBe("POST");

            const headers = init.headers as Record<string, string>;
            expect(headers.Authorization).toBe("Bearer fake-token");
            expect(headers["Content-Type"]).toBe("application/json");

            const body = JSON.parse(init.body as string) as {
                instances: Array<{ task_type: string; content: string }>;
                parameters: { outputDimensionality: number };
            };
            expect(body.instances).toEqual([{ task_type: "RETRIEVAL_DOCUMENT", content: "hello world" }]);
            expect(body.parameters).toEqual({ outputDimensionality: 768 });
        });

        it("maps inputType='query' to task_type='RETRIEVAL_QUERY'", async () => {
            const provider = new GoogleVertexEmbeddingProvider(makeConfigService());

            fetchSpy.mockResolvedValueOnce(
                makeFetchResponse({
                    predictions: [{ embeddings: { values: [0.5, 0.6] } }],
                }),
            );

            await provider.embed(["find me"], { inputType: "query" });

            const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
            const body = JSON.parse(init.body as string) as {
                instances: Array<{ task_type: string; content: string }>;
            };
            expect(body.instances[0]?.task_type).toBe("RETRIEVAL_QUERY");
        });

        it("unwraps predictions[].embeddings.values into number[][] preserving order", async () => {
            const provider = new GoogleVertexEmbeddingProvider(makeConfigService());

            fetchSpy.mockResolvedValueOnce(
                makeFetchResponse({
                    predictions: [
                        { embeddings: { values: [0.1, 0.2] } },
                        { embeddings: { values: [0.3, 0.4] } },
                        { embeddings: { values: [0.5, 0.6] } },
                    ],
                }),
            );

            const result = await provider.embed(["a", "b", "c"], { inputType: "document" });

            expect(result).toEqual([
                [0.1, 0.2],
                [0.3, 0.4],
                [0.5, 0.6],
            ]);
        });

        it("wraps HTTP 400 errors in EmbeddingProviderError with provider === 'google'", async () => {
            const provider = new GoogleVertexEmbeddingProvider(makeConfigService());

            fetchSpy.mockResolvedValueOnce(makeFetchResponse("invalid request payload", { ok: false, status: 400 }));

            await expect(provider.embed(["hello"], { inputType: "query" })).rejects.toMatchObject({
                name: "EmbeddingProviderError",
                provider: "google",
                message: expect.stringContaining("HTTP 400"),
            });

            fetchSpy.mockResolvedValueOnce(makeFetchResponse("invalid request payload", { ok: false, status: 400 }));
            await expect(provider.embed(["hello"], { inputType: "query" })).rejects.toBeInstanceOf(
                EmbeddingProviderError,
            );
        });

        it("batches requests when texts.length > 100 (Vertex max batch size)", async () => {
            const provider = new GoogleVertexEmbeddingProvider(makeConfigService({ EMBEDDING_DIMENSION: 2 }));

            const totalTexts = 101;
            const texts = Array.from({ length: totalTexts }, (_, i) => `text-${i}`);

            const firstBatchPredictions = Array.from({ length: 100 }, (_, i) => ({
                embeddings: { values: [i, i + 0.5] },
            }));
            const secondBatchPredictions = [{ embeddings: { values: [9999, 9999.5] } }];

            fetchSpy
                .mockResolvedValueOnce(makeFetchResponse({ predictions: firstBatchPredictions }))
                .mockResolvedValueOnce(makeFetchResponse({ predictions: secondBatchPredictions }));

            const result = await provider.embed(texts, { inputType: "document" });

            expect(fetchSpy).toHaveBeenCalledTimes(2);

            const firstInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
            const secondInit = fetchSpy.mock.calls[1]?.[1] as RequestInit;
            const firstBody = JSON.parse(firstInit.body as string) as { instances: unknown[] };
            const secondBody = JSON.parse(secondInit.body as string) as {
                instances: Array<{ content: string }>;
            };

            expect(firstBody.instances).toHaveLength(100);
            expect(secondBody.instances).toHaveLength(1);
            expect(secondBody.instances[0]?.content).toBe("text-100");

            expect(result).toHaveLength(totalTexts);
            expect(result[0]).toEqual([0, 0.5]);
            expect(result[99]).toEqual([99, 99.5]);
            expect(result[100]).toEqual([9999, 9999.5]);
        });

        it("wraps missing-token errors in EmbeddingProviderError", async () => {
            const provider = new GoogleVertexEmbeddingProvider(makeConfigService());
            getAccessTokenMock.mockResolvedValueOnce({ token: null });

            await expect(provider.embed(["hello"], { inputType: "query" })).rejects.toMatchObject({
                name: "EmbeddingProviderError",
                provider: "google",
                message: expect.stringContaining("Failed to acquire Google access token"),
            });
        });
    });
});
