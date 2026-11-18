import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import * as crypto from 'node:crypto';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { method, originalUrl } = req;
    const startTime = Date.now();

    // Propagate or generate high-entropy correlation ID
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      crypto.randomUUID();

    res.setHeader('X-Correlation-ID', correlationId);
    res.setHeader('X-Request-ID', correlationId);
    (req as any).correlationId = correlationId;

    const xForwardedFor = req.headers['x-forwarded-for'];
    const forwardedIp = typeof xForwardedFor === 'string' ? xForwardedFor.split(',')[0]?.trim() : undefined;
    const ip = forwardedIp || req.socket.remoteAddress || 'unknown-ip';

    return next.handle().pipe(
      tap({
        next: () => {
          const latencyMs = Date.now() - startTime;
          const isJson = process.env.LOG_FORMAT === 'json';

          if (isJson) {
            process.stdout.write(
              JSON.stringify({
                timestamp: new Date().toISOString(),
                level: 'INFO',
                service: 'matabai-api',
                correlationId,
                method,
                path: originalUrl,
                statusCode: res.statusCode,
                latencyMs,
                ip,
              }) + '\n',
            );
          } else {
            this.logger.log(
              `[${method}] ${originalUrl} -> ${res.statusCode} (${latencyMs}ms) [${correlationId}]`,
            );
          }
        },
        error: (err) => {
          const latencyMs = Date.now() - startTime;
          const isJson = process.env.LOG_FORMAT === 'json';

          if (isJson) {
            process.stderr.write(
              JSON.stringify({
                timestamp: new Date().toISOString(),
                level: 'WARN',
                service: 'matabai-api',
                correlationId,
                method,
                path: originalUrl,
                statusCode: res.statusCode || 500,
                latencyMs,
                error: err.message,
                ip,
              }) + '\n',
            );
          } else {
            this.logger.warn(
              `[${method}] ${originalUrl} -> ERROR (${latencyMs}ms) [${correlationId}]: ${err.message}`,
            );
          }
        },
      }),
    );
  }
}
