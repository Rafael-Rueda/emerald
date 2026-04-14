import type { ConfigService } from "@nestjs/config";

import { EmbeddingProviderError } from "@/domain/ai-context/application/providers/embedding-provider.error";
import type { Env } from "@/env/env";

// --- Mock the OpenAI SDK --------------------------------------------------
const embeddingsCreateMock = jest.fn();

jest.mock("openai", () => {
    const MockOpenAI = jest.fn().mockImplementation(() => ({
        embeddings: {
            create: embeddingsCreateMock,
        },
    }));

    return {
        __esModule: true,
        default: MockOpenAI,
    };
});

// Import AFTER the mock is registered so the provider picks up the mocked SDK.

const { OpenAiEmbeddingProvider } =
    require("../../openai.embedding-provider") as typeof import("../../openai.embedding-provider");

const OpenAIConstructorMock = require("openai").default as jest.Mock;

// --- Helpers --------------------------------------------------------------
type EnvValues = {
    OPENAI_API_KEY: string;
    OPENAI_EMBEDDING_MODEL: string;
    EMBEDDING_DIMENSION: number;
};

const makeConfigService = (overrides: Partial<EnvValues> = {}): ConfigService<Env, true> => {
    const values: EnvValues = {
        OPENAI_API_KEY: "test-openai-key",
        OPENAI_EMBEDDING_MODEL: "text-embedding-3-small",
        EMBEDDING_DIMENSION: 1536,
        ...overrides,
    };

    return {
        get: jest.fn((key: keyof EnvValues) => values[key]),
    } as unknown as ConfigService<Env, true>;
};

const makeEmbedding = (seed: number, length: number): number[] =>
    Array.from({ length }, (_, index) => seed + index * 0.0001);

// --- Tests ----------------------------------------------------------------
describe("OpenAiEmbeddingProvider", () => {
    beforeEach(() => {
        embeddingsCreateMock.mockReset();
        OpenAIConstructorMock.mockClear();
    });

    describe("construction", () => {
        it("initializes OpenAI SDK with api key and exposes dimension from env", () => {
            const cfg = makeConfigService({ EMBEDDING_DIMENSION: 512 });

            const provider = new OpenAiEmbeddingProvider(cfg);

            expect(OpenAIConstructorMock).toHaveBeenCalledWith({ apiKey: "test-openai-key" });
            expect(provider.name).toBe("openai");
            expect(provider.dimension).toBe(512);
        });

        it("reflects different EMBEDDING_DIMENSION values from env", () => {
            const provider = new OpenAiEmbeddingProvider(
                makeConfigService({ EMBEDDING_DIMENSION: 3072, OPENAI_EMBEDDING_MODEL: "text-embedding-3-large" }),
            );

            expect(provider.dimension).toBe(3072);
        });
    });

    describe("embed()", () => {
        it("returns [] for an empty input without calling the SDK", async () => {
            const provider = new OpenAiEmbeddingProvider(makeConfigService());

            const result = await provider.embed([], { inputType: "query" });

            expect(result).toEqual([]);
            expect(embeddingsCreateMock).not.toHaveBeenCalled();
        });

        it("calls embeddings.create with the correct model, input, dimensions, and encoding_format", async () => {
            const cfg = makeConfigService({ EMBEDDING_DIMENSION: 1024 });
            const provider = new OpenAiEmbeddingProvider(cfg);

            embeddingsCreateMock.mockResolvedValueOnce({
                data: [{ index: 0, embedding: makeEmbedding(1, 1024) }],
            });

            await provider.embed(["hello"], { inputType: "query" });

            expect(embeddingsCreateMock).toHaveBeenCalledTimes(1);
            expect(embeddingsCreateMock).toHaveBeenCalledWith({
                model: "text-embedding-3-small",
                input: ["hello"],
                dimensions: 1024,
                encoding_format: "float",
            });
        });

        it("ignores inputType (OpenAI does not distinguish document vs query)", async () => {
            const provider = new OpenAiEmbeddingProvider(makeConfigService());

            embeddingsCreateMock.mockResolvedValueOnce({
                data: [{ index: 0, embedding: makeEmbedding(1, 1536) }],
            });

            await provider.embed(["hello"], { inputType: "document" });

            const callArg = embeddingsCreateMock.mock.calls[0]?.[0] as Record<string, unknown>;
            expect(callArg).not.toHaveProperty("input_type");
            expect(callArg).not.toHaveProperty("inputType");
        });

        it("reorders response data by `index` (defensive against out-of-order responses)", async () => {
            const provider = new OpenAiEmbeddingProvider(makeConfigService({ EMBEDDING_DIMENSION: 4 }));

            const embeddingForIndex0 = [0.1, 0.2, 0.3, 0.4];
            const embeddingForIndex1 = [0.5, 0.6, 0.7, 0.8];
            const embeddingForIndex2 = [0.9, 1.0, 1.1, 1.2];

            // Intentionally shuffled order
            embeddingsCreateMock.mockResolvedValueOnce({
                data: [
                    { index: 2, embedding: embeddingForIndex2 },
                    { index: 0, embedding: embeddingForIndex0 },
                    { index: 1, embedding: embeddingForIndex1 },
                ],
            });

            const result = await provider.embed(["a", "b", "c"], { inputType: "document" });

            expect(result).toEqual([embeddingForIndex0, embeddingForIndex1, embeddingForIndex2]);
        });

        it("wraps SDK errors in EmbeddingProviderError with provider === 'openai'", async () => {
            const provider = new OpenAiEmbeddingProvider(makeConfigService());
            const sdkError = new Error("rate limited");
            embeddingsCreateMock.mockRejectedValueOnce(sdkError);

            await expect(provider.embed(["hello"], { inputType: "query" })).rejects.toMatchObject({
                name: "EmbeddingProviderError",
                provider: "openai",
                message: expect.stringContaining("rate limited"),
            });

            await expect(provider.embed(["hello"], { inputType: "query" })).rejects.toBeInstanceOf(
                EmbeddingProviderError,
            );
        });

        it("batches requests when texts.length > 2048", async () => {
            const provider = new OpenAiEmbeddingProvider(makeConfigService({ EMBEDDING_DIMENSION: 2 }));

            const totalTexts = 2049;
            const texts = Array.from({ length: totalTexts }, (_, i) => `text-${i}`);

            // First batch: 2048 items (indices 0..2047)
            // Second batch: 1 item  (index 0 in the new call)
            const firstBatchData = Array.from({ length: 2048 }, (_, i) => ({
                index: i,
                embedding: [i, i + 0.5],
            }));
            const secondBatchData = [{ index: 0, embedding: [9999, 9999.5] }];

            embeddingsCreateMock
                .mockResolvedValueOnce({ data: firstBatchData })
                .mockResolvedValueOnce({ data: secondBatchData });

            const result = await provider.embed(texts, { inputType: "document" });

            expect(embeddingsCreateMock).toHaveBeenCalledTimes(2);

            const firstCall = embeddingsCreateMock.mock.calls[0]?.[0] as { input: string[] };
            const secondCall = embeddingsCreateMock.mock.calls[1]?.[0] as { input: string[] };
            expect(firstCall.input).toHaveLength(2048);
            expect(secondCall.input).toHaveLength(1);
            expect(secondCall.input[0]).toBe("text-2048");

            expect(result).toHaveLength(totalTexts);
            expect(result[0]).toEqual([0, 0.5]);
            expect(result[2047]).toEqual([2047, 2047.5]);
            expect(result[2048]).toEqual([9999, 9999.5]);
        });
    });
});
