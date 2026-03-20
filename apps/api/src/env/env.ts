import dotenv from "dotenv";
import z from "zod";
import { fromZodError } from "zod-validation-error";

if (process.env.NODE_ENV !== "test") {
    dotenv.config();
}

export const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3333),
    DATABASE_URL: z.string(),

    JWT_PRIVATE_KEY: z.base64(),
    JWT_PUBLIC_KEY: z.base64(),

    GOOGLE_OAUTH2_CLIENT_ID: z.string(),
    GOOGLE_OAUTH2_CLIENT_SECRET: z.string(),
    GOOGLE_OAUTH2_REDIRECT_URL: z.string(),

    // GCP Storage
    GCP_BUCKET_NAME: z.string().optional(),
    GCP_KEY_FILE_PATH: z.string().optional(),
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

// export const env = validateEnv();
