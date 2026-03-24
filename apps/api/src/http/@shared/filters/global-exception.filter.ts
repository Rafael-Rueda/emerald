import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger("ExceptionFilter");

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        let status: number;
        let message: string;
        let errorName: string;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const responseBody = exception.getResponse();
            message =
                typeof responseBody === "string" ? responseBody : ((responseBody as any)?.message ?? exception.message);
            errorName = exception.constructor.name;
        } else if (exception instanceof Error) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = exception.message;
            errorName = exception.constructor.name;
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = "Unknown error";
            errorName = "UnknownError";
        }

        const logPayload = {
            statusCode: status,
            error: errorName,
            method: request.method,
            path: request.url,
            message,
        };

        if (status >= 500) {
            this.logger.error(
                `${request.method} ${request.url} → ${status} ${errorName}: ${message}`,
                exception instanceof Error ? exception.stack : undefined,
            );
        } else if (status >= 400) {
            this.logger.warn(`${request.method} ${request.url} → ${status} ${errorName}: ${message}`);
        }

        response.status(status).json({
            statusCode: status,
            error: errorName,
            message: Array.isArray(message) ? message : [message],
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}
