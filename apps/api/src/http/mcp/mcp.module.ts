import { Module } from "@nestjs/common";

import { AiContextModule } from "@/http/@shared/modules/ai-context.module";
import { McpController } from "@/http/mcp/mcp.controller";
import { McpServerManager } from "@/http/mcp/mcp-server.manager";

@Module({
    imports: [AiContextModule],
    controllers: [McpController],
    providers: [McpServerManager],
})
export class McpModule {}
