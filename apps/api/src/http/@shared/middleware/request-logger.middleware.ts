import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger("HTTP");

    use(req: Request, res: Response, next: NextFunction) {
        const start = Date.now();
        const { method, originalUrl } = req;

        res.on("finish", () => {
            const duration = Date.now() - start;
            const { statusCode } = res;

            const logMessage = `${method} ${originalUrl} ${statusCode} ${duration}ms`;

            if (statusCode >= 500) {
                this.logger.error(logMessage);
            } else if (statusCode >= 400) {
                this.logger.warn(logMessage);
            } else {
                this.logger.log(logMessage);
            }
        });

        next();
    }
}
