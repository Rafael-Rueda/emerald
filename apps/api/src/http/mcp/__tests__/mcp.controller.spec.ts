import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { Request, Response } from "express";

import { type AiContextService } from "../../../domain/ai-context/application/ai-context.service";
import { McpController } from "../mcp.controller";
import { McpServerManager } from "../mcp-server.manager";

type MockTransport = {
    handleRequest: jest.Mock<Promise<void>, [Request, Response, unknown?]>;
    close: jest.Mock<Promise<void>, []>;
    onclose?: () => void;
};

type MockServer = {
    connect: jest.Mock<Promise<void>, [unknown]>;
    registerTool: jest.Mock<
        void,
        [string, unknown, (args: { query: string; space: string; version: string }) => unknown]
    >;
    close: jest.Mock<Promise<void>, []>;
};

const createMockRequest = (sessionId?: string): Request =>
    ({
        headers: sessionId ? { "mcp-session-id": sessionId } : {},
    }) as Request;

const createMockResponse = (): Response => ({}) as Response;

const createMockTransport = (): MockTransport => ({
    handleRequest: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
});

const createMockServer = (): MockServer => ({
    connect: jest.fn().mockResolvedValue(undefined),
    registerTool: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
});

describe("McpServerManager", () => {
    let manager: McpServerManager;
    let aiContextService: jest.Mocked<Pick<AiContextService, "semanticSearch">>;

    beforeEach(() => {
        aiContextService = {
            semanticSearch: jest.fn(),
        };

        manager = new McpServerManager(aiContextService as AiContextService);
    });

    it("creates and caches a server per session", () => {
        const server = createMockServer();
        jest.spyOn(manager as any, "createServerInstance").mockReturnValue(server);

        const first = manager.getOrCreateServer("session-1");
        const second = manager.getOrCreateServer("session-1");

        expect(first).toBe(server);
        expect(second).toBe(server);
        expect((manager as any).createServerInstance).toHaveBeenCalledTimes(1);
    });

    it("registers search_documentation and returns serialized semantic search response", async () => {
        const semanticResult = {
            entityId: "query",
            entityType: "semantic-search",
            chunks: [],
        };

        aiContextService.semanticSearch.mockResolvedValue(semanticResult as any);

        const server = createMockServer();
        jest.spyOn(manager as any, "createServerInstance").mockReturnValue(server);

        manager.getOrCreateServer("session-1");

        expect(server.registerTool).toHaveBeenCalledTimes(1);

        const [, config, handler] = server.registerTool.mock.calls[0];

        expect(config).toEqual(
            expect.objectContaining({
                inputSchema: expect.objectContaining({
                    query: expect.anything(),
                    space: expect.anything(),
                    version: expect.anything(),
                }),
            }),
        );

        const result = (await handler({ query: "query", space: "guides", version: "v1" })) as {
            content: Array<{ type: string; text: string }>;
        };

        expect(aiContextService.semanticSearch).toHaveBeenCalledWith("query", "guides", "v1");
        expect(result.content[0]).toEqual({
            type: "text",
            text: JSON.stringify(semanticResult),
        });
    });

    it("returns a graceful tool error when semantic search throws", async () => {
        aiContextService.semanticSearch.mockRejectedValue(new Error("db down"));

        const server = createMockServer();
        jest.spyOn(manager as any, "createServerInstance").mockReturnValue(server);

        manager.getOrCreateServer("session-1");
        const [, , handler] = server.registerTool.mock.calls[0];

        const result = (await handler({ query: "q", space: "s", version: "v" })) as {
            isError?: boolean;
            content: Array<{ type: string; text: string }>;
        };

        expect(result.isError).toBe(true);
        expect(result.content[0].type).toBe("text");
    });

    it("closes and removes cached server", async () => {
        const server = createMockServer();
        jest.spyOn(manager as any, "createServerInstance").mockReturnValue(server);

        manager.getOrCreateServer("session-1");
        await manager.closeServer("session-1");

        expect(server.close).toHaveBeenCalledTimes(1);
        expect(manager.hasServer("session-1")).toBe(false);
    });
});

describe("McpController", () => {
    let manager: jest.Mocked<Pick<McpServerManager, "getOrCreateServer" | "closeServer">>;
    let controller: McpController;

    beforeEach(() => {
        manager = {
            getOrCreateServer: jest.fn(),
            closeServer: jest.fn().mockResolvedValue(undefined),
        };

        controller = new McpController(manager as McpServerManager);
    });

    it("creates transport + server connection on initialize request", async () => {
        const server = createMockServer();
        const transport = createMockTransport();

        manager.getOrCreateServer.mockReturnValue(server as any);
        jest.spyOn(controller as any, "isInitializeRequest").mockReturnValue(true);
        jest.spyOn(controller as any, "generateSessionId").mockReturnValue("session-1");
        jest.spyOn(controller as any, "createTransport").mockReturnValue(transport);

        const request = createMockRequest();
        const response = createMockResponse();
        const body = { jsonrpc: "2.0", method: "initialize" };

        await controller.handlePost(request, response, body);

        expect(manager.getOrCreateServer).toHaveBeenCalledWith("session-1");
        expect(server.connect).toHaveBeenCalledWith(transport);
        expect(transport.handleRequest).toHaveBeenCalledWith(request, response, body);
        expect((controller as any).transports["session-1"]).toBe(transport);
    });

    it("reuses existing session transport on POST", async () => {
        const transport = createMockTransport();
        (controller as any).transports["session-1"] = transport;

        const request = createMockRequest("session-1");
        const response = createMockResponse();

        await controller.handlePost(request, response, { jsonrpc: "2.0", method: "tools/list" });

        expect(transport.handleRequest).toHaveBeenCalledWith(request, response, {
            jsonrpc: "2.0",
            method: "tools/list",
        });
    });

    it("throws 400 on POST when no session and request is not initialize", async () => {
        jest.spyOn(controller as any, "isInitializeRequest").mockReturnValue(false);

        await expect(
            controller.handlePost(createMockRequest(), createMockResponse(), { jsonrpc: "2.0", method: "tools/list" }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws 400 on POST when session id is unknown", async () => {
        await expect(
            controller.handlePost(createMockRequest("unknown"), createMockResponse(), {
                jsonrpc: "2.0",
                method: "tools/list",
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("handles GET for a valid session", async () => {
        const transport = createMockTransport();
        (controller as any).transports["session-1"] = transport;

        const request = createMockRequest("session-1");
        const response = createMockResponse();

        await controller.handleGet(request, response);

        expect(transport.handleRequest).toHaveBeenCalledWith(request, response);
    });

    it("throws 404 on GET with unknown session", async () => {
        await expect(controller.handleGet(createMockRequest("unknown"), createMockResponse())).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it("handles DELETE and cleans session", async () => {
        const transport = createMockTransport();
        (controller as any).transports["session-1"] = transport;

        const request = createMockRequest("session-1");
        const response = createMockResponse();

        await controller.handleDelete(request, response);

        expect(transport.handleRequest).toHaveBeenCalledWith(request, response);
        expect(transport.close).toHaveBeenCalledTimes(1);
        expect(manager.closeServer).toHaveBeenCalledWith("session-1");
        expect((controller as any).transports["session-1"]).toBeUndefined();
    });

    it("throws 404 on DELETE with unknown session", async () => {
        await expect(
            controller.handleDelete(createMockRequest("unknown"), createMockResponse()),
        ).rejects.toBeInstanceOf(NotFoundException);
    });
});
