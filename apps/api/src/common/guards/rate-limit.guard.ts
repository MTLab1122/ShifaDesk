import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly clients = new Map<string, RateLimitRecord>();

  // Cleanup expired entries every 5 minutes to prevent memory leaks
  constructor() {
    setInterval(() => this.pruneExpired(), 5 * 60 * 1000).unref();
  }

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const xForwardedFor = req.headers['x-forwarded-for'];
    const forwardedIp = typeof xForwardedFor === 'string' ? xForwardedFor.split(',')[0]?.trim() : undefined;
    const ip = forwardedIp || req.socket.remoteAddress || 'unknown-ip';

    const path = req.originalUrl || req.url;
    const isSensitiveAuth = path.includes('/auth/login') || path.includes('/onboarding/register');
    const isReportVerify = path.includes('/reports/access/') && path.includes('/verify');

    // Default configuration (can be overridden via env)
    const windowSec = Number(process.env.RATE_LIMIT_TTL) || 60;
    let maxRequests = Number(process.env.RATE_LIMIT_MAX) || 100;

    // Strict limits for sensitive authentication and verification endpoints
    if (isSensitiveAuth) {
      maxRequests = 10;
    } else if (isReportVerify) {
      maxRequests = 15;
    }

    const key = `${ip}:${isSensitiveAuth ? 'auth' : isReportVerify ? 'report' : 'api'}`;
    const now = Date.now();
    let record = this.clients.get(key);

    if (!record || now >= record.resetAt) {
      record = {
        count: 1,
        resetAt: now + windowSec * 1000,
      };
      this.clients.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const resetTimeSeconds = Math.ceil(record.resetAt / 1000);

    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTimeSeconds);

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);

      this.logger.warn(`Rate limit exceeded for IP ${ip} on route ${path}`);
      throw new HttpException(
        {
          success: false,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'TooManyRequests',
          errorCode: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Please retry in ${retryAfter} seconds.`,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, record] of this.clients.entries()) {
      if (now >= record.resetAt) {
        this.clients.delete(key);
      }
    }
  }
}
