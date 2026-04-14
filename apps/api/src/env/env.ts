import dotenv from "dotenv";
import z from "zod";
import { fromZodError } from "zod-validation-error";

if (process.env.NODE_ENV !== "test") {
    dotenv.config();
}

// Allowed embedding dimensions per Voyage model.
// voyage-3-lite: fixed 512.
// voyage-3: fixed 1024.
// voyage-3-large / voyage-code-3: Matryoshka-style — {256, 512, 1024, 2048}.
// Models not listed here are accepted without strict validation (new/custom models).
// Source: https://docs.voyageai.com/docs/embeddings
const VOYAGE_MODEL_ALLOWED_DIMENSIONS: Record<string, number[]> = {
    "voyage-3-lite": [512],
    "voyage-3": [1024],
    "voyage-3-large": [256, 512, 1024, 2048],
    "voyage-code-3": [256, 512, 1024, 2048],
};

// OpenAI models support "Matryoshka" dimension reduction to specific sizes.
// Source: https://platform.openai.com/docs/guides/embeddings
const OPENAI_MODEL_ALLOWED_DIMENSIONS: Record<string, number[]> = {
    "text-embedding-3-small": [512, 768, 1024, 1536],
    "text-embedding-3-large": [256, 1024, 3072],
};

// Google Vertex embedding models support Matryoshka-style output dimensionality.
// text-embedding-004 / text-multilingual-embedding-002: 128, 256, 512, 768 (default).
// gemini-embedding-001: up to 3072 (flexible — no strict allow-list enforced here).
// Source: https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings
const GOOGLE_MODEL_ALLOWED_DIMENSIONS: Record<string, number[]> = {
    "text-embedding-004": [128, 256, 512, 768],
    "text-multilingual-embedding-002": [128, 256, 512, 768],
};

// Ollama embedding models — dimensions are fixed by the model architecture
// (no Matryoshka reduction). Models not listed here are accepted without
// validation to leave room for custom / community models.
// Sources:
//   https://ollama.com/library/nomic-embed-text        (768)
//   https://ollama.com/library/mxbai-embed-large       (1024)
//   https://ollama.com/library/all-minilm              (384)
//   https://ollama.com/library/bge-m3                  (1024)
//   https://ollama.com/library/snowflake-arctic-embed  (1024)
const OLLAMA_MODEL_ALLOWED_DIMENSIONS: Record<string, number[]> = {
    "nomic-embed-text": [768],
    "mxbai-embed-large": [1024],
    "all-minilm": [384],
    "bge-m3": [1024],
    "snowflake-arctic-embed": [1024],
};

export const envSchema = z
    .object({
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
        PORT: z.coerce.number().int().positive().default(3333),
        MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),
        DATABASE_URL: z.string(),

        JWT_PRIVATE_KEY: z.base64(),
        JWT_PUBLIC_KEY: z.base64(),

        GOOGLE_OAUTH2_CLIENT_ID: z.string(),
        GOOGLE_OAUTH2_CLIENT_SECRET: z.string(),
        GOOGLE_OAUTH2_REDIRECT_URL: z.string(),

        // ---- Embedding provider selection ----
        EMBEDDING_PROVIDER: z.enum(["voyage", "openai", "google", "ollama"]).default("voyage"),
        EMBEDDING_DIMENSION: z.coerce.number().int().positive().default(512),

        // Voyage (optional; required only when EMBEDDING_PROVIDER=voyage — enforced via superRefine)
        VOYAGE_API_KEY: z.string().min(1).optional(),
        VOYAGE_MODEL: z.string().default("voyage-3-lite"),

        // OpenAI (optional; required only when EMBEDDING_PROVIDER=openai — enforced via superRefine)
        OPENAI_API_KEY: z.string().min(1).optional(),
        OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

        // Google Vertex AI (optional; required only when EMBEDDING_PROVIDER=google — enforced via superRefine)
        // Auth uses the standard GOOGLE_APPLICATION_CREDENTIALS convention (path to the service
        // account JSON file). The adapter calls the Vertex predict REST API directly via
        // google-auth-library, avoiding the heavy @google-cloud/aiplatform SDK.
        GOOGLE_PROJECT_ID: z.string().min(1).optional(),
        GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1).optional(),
        GOOGLE_VERTEX_LOCATION: z.string().default("us-central1"),
        GOOGLE_EMBEDDING_MODEL: z.string().default("text-embedding-004"),

        // Ollama (self-hosted, no API key required). BASE_URL has a local default
        // so the schema is happy out of the box; the adapter surfaces a helpful
        // hint if the daemon is unreachable. Model dimensions are fixed per model;
        // see OLLAMA_MODEL_ALLOWED_DIMENSIONS for the enforced allow-list.
        OLLAMA_BASE_URL: z.url().default("http://localhost:11434"),
        OLLAMA_EMBEDDING_MODEL: z.string().default("nomic-embed-text"),

        LOG_LEVEL: z.enum(["error", "warn", "log", "debug", "verbose"]).default("log"),

        CORS_ALLOWED_ORIGINS: z
            .string()
            .optional()
            .default("http://localhost:3000,http://localhost:3100,http://localhost:3101"),

        DOCS_APP_URL: z.url().optional(),
        DOCS_REVALIDATE_SECRET: z.string().min(1).optional(),

        // GCP Storage
        GCP_BUCKET_NAME: z.string().optional(),
        GCP_KEY_FILE_PATH: z.string().optional(),
    })
    .superRefine((env, ctx) => {
        const provider = env.EMBEDDING_PROVIDER;
        const dimension = env.EMBEDDING_DIMENSION;

        if (provider === "voyage") {
            if (!env.VOYAGE_API_KEY) {
                ctx.addIssue({
                    code: "custom",
                    path: ["VOYAGE_API_KEY"],
                    message: "VOYAGE_API_KEY required when EMBEDDING_PROVIDER=voyage",
                });
            }
            const allowed = VOYAGE_MODEL_ALLOWED_DIMENSIONS[env.VOYAGE_MODEL];
            if (allowed && !allowed.includes(dimension)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["EMBEDDING_DIMENSION"],
                    message: `EMBEDDING_DIMENSION=${dimension} not supported by Voyage model "${env.VOYAGE_MODEL}". Allowed: ${allowed.join(
                        ", ",
                    )}`,
                });
            }
            // Voyage models not listed in VOYAGE_MODEL_ALLOWED_DIMENSIONS are
            // intentionally not validated to leave room for future/custom models.
        }

        if (provider === "openai") {
            if (!env.OPENAI_API_KEY) {
                ctx.addIssue({
                    code: "custom",
                    path: ["OPENAI_API_KEY"],
                    message: "OPENAI_API_KEY required when EMBEDDING_PROVIDER=openai",
                });
            }
            const allowed = OPENAI_MODEL_ALLOWED_DIMENSIONS[env.OPENAI_EMBEDDING_MODEL];
            if (allowed && !allowed.includes(dimension)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["EMBEDDING_DIMENSION"],
                    message: `EMBEDDING_DIMENSION=${dimension} not supported by OpenAI model "${env.OPENAI_EMBEDDING_MODEL}". Allowed: ${allowed.join(
                        ", ",
                    )}`,
                });
            }
        }

        if (provider === "google") {
            if (!env.GOOGLE_PROJECT_ID) {
                ctx.addIssue({
                    code: "custom",
                    path: ["GOOGLE_PROJECT_ID"],
                    message: "GOOGLE_PROJECT_ID required when EMBEDDING_PROVIDER=google",
                });
            }
            if (!env.GOOGLE_APPLICATION_CREDENTIALS) {
                ctx.addIssue({
                    code: "custom",
                    path: ["GOOGLE_APPLICATION_CREDENTIALS"],
                    message:
                        "GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON) required when EMBEDDING_PROVIDER=google",
                });
            }
            const allowed = GOOGLE_MODEL_ALLOWED_DIMENSIONS[env.GOOGLE_EMBEDDING_MODEL];
            if (allowed && !allowed.includes(dimension)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["EMBEDDING_DIMENSION"],
                    message: `EMBEDDING_DIMENSION=${dimension} not supported by Google model "${env.GOOGLE_EMBEDDING_MODEL}". Allowed: ${allowed.join(
                        ", ",
                    )}`,
                });
            }
            // Other Google models (e.g. gemini-embedding-001) accept flexible dimensions up to 3072;
            // no strict allow-list is enforced here.
        }

        if (provider === "ollama") {
            // OLLAMA_BASE_URL has a default (http://localhost:11434), so no
            // presence check is needed. Auth is not required (self-hosted).
            const allowed = OLLAMA_MODEL_ALLOWED_DIMENSIONS[env.OLLAMA_EMBEDDING_MODEL];
            if (allowed && !allowed.includes(dimension)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["EMBEDDING_DIMENSION"],
                    message: `EMBEDDING_DIMENSION=${dimension} not supported by Ollama model "${env.OLLAMA_EMBEDDING_MODEL}". Allowed: ${allowed.join(
                        ", ",
                    )}`,
                });
            }
            // Models not in the allow-list are intentionally not validated
            // (custom/community models have arbitrary fixed dimensions).
        }
    });

export type Env = z.infer<typeof envSchema>;

export function validateEnv() {
    const parsedEnv = envSchema.safeParse(process.env);

    if (!parsedEnv.success) {
        console.error("❌ Invalid environment variables:", fromZodError(parsedEnv.error));
        process.exit(1);
    }

    return parsedEnv.data;
}

export const env = validateEnv();
