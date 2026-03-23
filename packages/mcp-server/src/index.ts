import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

import { searchDocumentation } from "./client.js";

function buildErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "search_documentation failed";
}

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "emerald-mcp-server",
    version: "1.0.0",
  });

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
        const response = await searchDocumentation({ query, space, version });

        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: buildErrorMessage(error) }],
        };
      }
    },
  );

  return server;
}

export async function startServer(): Promise<void> {
  const transport = new StdioServerTransport();
  const server = createMcpServer();
  await server.connect(transport);
}

if (require.main === module) {
  startServer().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Failed to start MCP server: ${message}\n`);
    process.exit(1);
  });
}
