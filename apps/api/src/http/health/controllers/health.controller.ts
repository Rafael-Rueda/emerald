import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { HealthDegradedResponseDTO, HealthOkResponseDTO } from "../schemas/health.schema";

import { Public } from "@/http/auth/decorators/public.decorator";
import { PrismaService } from "@/infra/database/prisma/prisma.service";

@ApiTags("Health")
@Controller("/health")
export class HealthController {
    constructor(private readonly prismaService: PrismaService) {}

    @Public()
    @Get()
    @ApiOperation({
        summary: "API health status",
        description: "Checks API and database connectivity state",
    })
    @ApiResponse({
        status: 200,
        description: "API and database are healthy",
        type: HealthOkResponseDTO,
    })
    @ApiResponse({
        status: 503,
        description: "API is reachable but database is unavailable",
        type: HealthDegradedResponseDTO,
    })
    async getHealth(
        @Res({ passthrough: true }) response: Response,
    ): Promise<HealthOkResponseDTO | HealthDegradedResponseDTO> {
        try {
            await this.prismaService.$queryRaw`SELECT 1`;

            return {
                status: "ok",
                db: "up",
            };
        } catch {
            response.status(HttpStatus.SERVICE_UNAVAILABLE);

            return {
                status: "degraded",
                db: "down",
            };
        }
    }
}
