import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import type { Env } from "@/env/env";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger("Prisma");

    constructor(configService: ConfigService<Env, true>) {
        const databaseUrl = configService.get("DATABASE_URL", { infer: true });
        const nodeEnv = configService.get("NODE_ENV", { infer: true });
        const logLevel = configService.get("LOG_LEVEL", { infer: true });
        const adapter = new PrismaPg({ connectionString: databaseUrl });

        const logOptions: any[] = [{ emit: "event", level: "error" }];

        if (nodeEnv === "development" || logLevel === "debug" || logLevel === "verbose") {
            logOptions.push({ emit: "event", level: "warn" });
            logOptions.push({ emit: "event", level: "query" });
        }

        super({ adapter, log: logOptions });
    }

    async onModuleInit() {
        await this.$connect();
        this.logger.log("Database connection established");

        // @ts-expect-error -- Prisma event typing
        this.$on("error", (event: { message: string }) => {
            this.logger.error(`Database error: ${event.message}`);
        });

        // @ts-expect-error -- Prisma event typing
        this.$on("warn", (event: { message: string }) => {
            this.logger.warn(`Database warning: ${event.message}`);
        });

        // @ts-expect-error -- Prisma event typing
        this.$on("query", (event: { query: string; params: string; duration: number }) => {
            if (event.duration > 200) {
                this.logger.warn(`Slow query (${event.duration}ms): ${event.query}`);
            } else {
                this.logger.debug(`Query (${event.duration}ms): ${event.query}`);
            }
        });
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log("Database connection closed");
    }
}
