import { randomUUID } from "node:crypto";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Logger,
    NotFoundException,
    Post,
    Req,
    Res,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { Public } from "@/http/auth/decorators/public.decorator";
import { McpServerManager } from "@/http/mcp/mcp-server.manager";

@Public()
@Controller("/api/mcp")
export class McpController {
    private readonly logger = new Logger(McpController.name);

    private readonly transports: Record<string, StreamableHTTPServerTransport> = {};

    constructor(private readonly mcpServerManager: McpServerManager) {}

    @Post()
    async handlePost(
        @Req() request: Request,
        @Res({ passthrough: false }) response: Response,
        @Body() body: unknown,
    ): Promise<void> {
        const sessionId = this.extractSessionId(request);

        if (!sessionId) {
            if (!this.isInitializeRequest(body)) {
                throw new BadRequestException("Bad Request: No valid session ID provided");
            }

            const newSessionId = this.generateSessionId();
            const transport = this.createTransport(newSessionId);

            this.transports[newSessionId] = transport;
            transport.onclose = () => {
                void this.cleanupSession(newSessionId, false);
            };

            try {
                const server = this.mcpServerManager.getOrCreateServer(newSessionId);

                await server.connect(transport);
                await transport.handleRequest(request, response, body);
            } catch (error) {
                await this.cleanupSession(newSessionId, true);
                throw error;
            }

            return;
        }

        const transport = this.transports[sessionId];
        if (!transport) {
            throw new BadRequestException("Bad Request: No valid session ID provided");
        }

        await transport.handleRequest(request, response, body);
    }

    @Get()
    async handleGet(@Req() request: Request, @Res({ passthrough: false }) response: Response): Promise<void> {
        const sessionId = this.extractRequiredSessionId(request);
        const transport = this.transports[sessionId];

        if (!transport) {
            throw new NotFoundException(`Unknown MCP session id: ${sessionId}`);
        }

        await transport.handleRequest(request, response);
    }

    @Delete()
    async handleDelete(@Req() request: Request, @Res({ passthrough: false }) response: Response): Promise<void> {
        const sessionId = this.extractRequiredSessionId(request);
        const transport = this.transports[sessionId];

        if (!transport) {
            throw new NotFoundException(`Unknown MCP session id: ${sessionId}`);
        }

        try {
            await transport.handleRequest(request, response);
        } finally {
            await this.cleanupSession(sessionId, true);
        }
    }

    protected generateSessionId(): string {
        return randomUUID();
    }

    protected createTransport(sessionId: string): StreamableHTTPServerTransport {
        return new StreamableHTTPServerTransport({
            sessionIdGenerator: () => sessionId,
        });
    }

    protected isInitializeRequest(body: unknown): boolean {
        return isInitializeRequest(body);
    }

    private extractRequiredSessionId(request: Request): string {
        const sessionId = this.extractSessionId(request);
        if (!sessionId) {
            throw new BadRequestException("Missing Mcp-Session-Id header");
        }

        return sessionId;
    }

    private extractSessionId(request: Request): string | undefined {
        const headerValue = request.headers["mcp-session-id"];

        if (Array.isArray(headerValue)) {
            return headerValue[0];
        }

        return headerValue;
    }

    private async cleanupSession(sessionId: string, closeTransport: boolean): Promise<void> {
        const transport = this.transports[sessionId];

        if (transport) {
            delete this.transports[sessionId];

            if (closeTransport) {
                await transport.close().catch((error) => {
                    this.logger.error("Failed to close MCP transport", {
                        sessionId,
                        error: error instanceof Error ? error.message : String(error),
                    });
                });
            }
        }

        await this.mcpServerManager.closeServer(sessionId).catch((error) => {
            this.logger.error("Failed to close MCP server", {
                sessionId,
                error: error instanceof Error ? error.message : String(error),
            });
        });
    }
}
