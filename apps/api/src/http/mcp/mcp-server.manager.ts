import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Injectable, Logger } from "@nestjs/common";
import * as z from "zod/v4";

import { AiContextService } from "@/domain/ai-context/application/ai-context.service";

@Injectable()
export class McpServerManager {
    private readonly logger = new Logger(McpServerManager.name);

    private readonly servers: Record<string, McpServer> = {};

    constructor(private readonly aiContextService: AiContextService) {}

    hasServer(sessionId: string): boolean {
        return this.servers[sessionId] !== undefined;
    }

    getOrCreateServer(sessionId: string): McpServer {
        const cachedServer = this.servers[sessionId];
        if (cachedServer) {
            return cachedServer;
        }

        const server = this.createServerInstance();

        server.registerTool(
            "search_documentation",
            {
                description: "Search Emerald documentation with semantic search.",
                inputSchema: {
                    query: z.string().min(1),
                    space: z.string().min(1),
                    version: z.string().min(1),
                },
            },
            async ({ query, space, version }) => {
                try {
                    const semanticSearchResult = await this.aiContextService.semanticSearch(query, space, version);

                    return {
                        content: [{ type: "text", text: JSON.stringify(semanticSearchResult) }],
                    };
                } catch (error) {
                    this.logger.error("search_documentation tool failed", {
                        sessionId,
                        error: error instanceof Error ? error.message : String(error),
                    });

                    return {
                        isError: true,
                        content: [
                            {
                                type: "text",
                                text: "Failed to execute semantic documentation search.",
                            },
                        ],
                    };
                }
            },
        );

        this.servers[sessionId] = server;
        return server;
    }

    async closeServer(sessionId: string): Promise<void> {
        const server = this.servers[sessionId];
        if (!server) {
            return;
        }

        await server.close();
        delete this.servers[sessionId];
    }

    private createServerInstance(): McpServer {
        return new McpServer({
            name: "emerald-mcp-server",
            version: "1.0.0",
        });
    }
}
