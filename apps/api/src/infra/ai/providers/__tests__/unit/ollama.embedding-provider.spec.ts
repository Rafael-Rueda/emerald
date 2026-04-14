import type { ConfigService } from "@nestjs/config";

import { OllamaEmbeddingProvider } from "../../ollama.embedding-provider";

import { EmbeddingProviderError } from "@/domain/ai-context/application/providers/embedding-provider.error";
import type { Env } from "@/env/env";

// --- Helpers --------------------------------------------------------------
type EnvValues = {
    OLLAMA_BASE_URL: string;
    OLLAMA_EMBEDDING_MODEL: string;
    EMBEDDING_DIMENSION: number;
};

const makeConfigService = (overrides: Partial<EnvValues> = {}): ConfigService<Env, true> => {
    const values: EnvValues = {
        OLLAMA_BASE_URL: "http://localhost:11434",
        OLLAMA_EMBEDDING_MODEL: "nomic-embed-text",
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
describe("OllamaEmbeddingProvider", () => {
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
        fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() => {
            throw new Error("fetch mock not configured for this test");
        });
    });

    afterEach(() => {
        fetchSpy.mockRestore();
    });

    describe("construction", () => {
        it("exposes dimension from env and normalizes baseUrl (strips trailing slash)", () => {
            const cfg = makeConfigService({
                EMBEDDING_DIMENSION: 1024,
                OLLAMA_BASE_URL: "http://ollama.internal:11434/",
            });

            const provider = new OllamaEmbeddingProvider(cfg);

            expect(provider.name).toBe("ollama");
            expect(provider.dimension).toBe(1024);
        });
    });

    describe("embed()", () => {
        it("returns [] for an empty input without calling fetch", async () => {
            const provider = new OllamaEmbeddingProvider(makeConfigService());

            const result = await provider.embed([], { inputType: "query" });

            expect(result).toEqual([]);
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it("POSTs to {baseUrl}/api/embed with JSON body { model, input }", async () => {
            const provider = new OllamaEmbeddingProvider(
                makeConfigService({
                    OLLAMA_BASE_URL: "http://localhost:11434/",
                    OLLAMA_EMBEDDING_MODEL: "nomic-embed-text",
                }),
            );

            fetchSpy.mockResolvedValueOnce(makeFetchResponse({ embeddings: [[0.1, 0.2]] }));

            await provider.embed(["hello"], { inputType: "document" });

            expect(fetchSpy).toHaveBeenCalledTimes(1);

            const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];

            // Trailing slash normalized away.
            expect(url).toBe("http://localhost:11434/api/embed");
            expect(init.method).toBe("POST");

            const headers = init.headers as Record<string, string>;
            expect(headers["Content-Type"]).toBe("application/json");

            const body = JSON.parse(init.body as string) as { model: string; input: string[] };
            expect(body).toEqual({ model: "nomic-embed-text", input: ["hello"] });
        });

        it("unwraps response.embeddings into number[][] preserving order", async () => {
            const provider = new OllamaEmbeddingProvider(makeConfigService());

            fetchSpy.mockResolvedValueOnce(
                makeFetchResponse({
                    embeddings: [
                        [0.1, 0.2],
                        [0.3, 0.4],
                    ],
                }),
            );

            const result = await provider.embed(["a", "b"], { inputType: "document" });

            expect(result).toEqual([
                [0.1, 0.2],
                [0.3, 0.4],
            ]);
        });

        it("wraps HTTP 500 errors in EmbeddingProviderError with provider === 'ollama'", async () => {
            const provider = new OllamaEmbeddingProvider(makeConfigService());

            fetchSpy.mockResolvedValueOnce(makeFetchResponse("internal error", { ok: false, status: 500 }));

            await expect(provider.embed(["hello"], { inputType: "query" })).rejects.toMatchObject({
                name: "EmbeddingProviderError",
                provider: "ollama",
                message: expect.stringContaining("HTTP 500"),
            });

            fetchSpy.mockResolvedValueOnce(makeFetchResponse("internal error", { ok: false, status: 500 }));
            await expect(provider.embed(["hello"], { inputType: "query" })).rejects.toBeInstanceOf(
                EmbeddingProviderError,
            );
        });

        it("adds a running-at hint when fetch fails with ECONNREFUSED", async () => {
            const provider = new OllamaEmbeddingProvider(
                makeConfigService({ OLLAMA_BASE_URL: "http://localhost:11434" }),
            );

            fetchSpy.mockRejectedValueOnce(new Error("connect ECONNREFUSED 127.0.0.1:11434"));

            await expect(provider.embed(["hello"], { inputType: "query" })).rejects.toMatchObject({
                name: "EmbeddingProviderError",
                provider: "ollama",
                message: expect.stringContaining("(is Ollama running at http://localhost:11434?)"),
            });
        });

        it("throws EmbeddingProviderError when response shape is unexpected (missing `embeddings`)", async () => {
            const provider = new OllamaEmbeddingProvider(makeConfigService());

            fetchSpy.mockResolvedValueOnce(makeFetchResponse({ not_embeddings: [] }));

            await expect(provider.embed(["hello"], { inputType: "document" })).rejects.toMatchObject({
                name: "EmbeddingProviderError",
                provider: "ollama",
                message: expect.stringContaining("Unexpected response shape"),
            });
        });

        it("batches requests when texts.length > 64 (MAX_BATCH_SIZE)", async () => {
            const provider = new OllamaEmbeddingProvider(makeConfigService({ EMBEDDING_DIMENSION: 2 }));

            const totalTexts = 65;
            const texts = Array.from({ length: totalTexts }, (_, i) => `text-${i}`);

            const firstBatchEmbeddings = Array.from({ length: 64 }, (_, i) => [i, i + 0.5]);
            const secondBatchEmbeddings = [[9999, 9999.5]];

            fetchSpy
                .mockResolvedValueOnce(makeFetchResponse({ embeddings: firstBatchEmbeddings }))
                .mockResolvedValueOnce(makeFetchResponse({ embeddings: secondBatchEmbeddings }));

            const result = await provider.embed(texts, { inputType: "document" });

            expect(fetchSpy).toHaveBeenCalledTimes(2);

            const firstBody = JSON.parse((fetchSpy.mock.calls[0]?.[1] as RequestInit).body as string) as {
                input: string[];
            };
            const secondBody = JSON.parse((fetchSpy.mock.calls[1]?.[1] as RequestInit).body as string) as {
                input: string[];
            };

            expect(firstBody.input).toHaveLength(64);
            expect(secondBody.input).toHaveLength(1);
            expect(secondBody.input[0]).toBe("text-64");

            expect(result).toHaveLength(totalTexts);
            expect(result[0]).toEqual([0, 0.5]);
            expect(result[63]).toEqual([63, 63.5]);
            expect(result[64]).toEqual([9999, 9999.5]);
        });
    });
});
