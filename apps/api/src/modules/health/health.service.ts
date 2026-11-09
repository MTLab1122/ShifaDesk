import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { HealthCheckResponse, HealthState } from '@matabai/shared';

@Injectable()
export class HealthService {
  private readonly processStartTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async checkHealth(): Promise<HealthCheckResponse> {
    const dbPing = await this.prisma.ping();

    const memUsage = process.memoryUsage();
    const isMemoryHealthy = memUsage.heapUsed < 1024 * 1024 * 1024; // < 1GB

    const checks = {
      database: {
        status: dbPing.ok ? ('up' as const) : ('down' as const),
        latencyMs: dbPing.latencyMs,
        ...(dbPing.error && { message: dbPing.error }),
      },
      memory: {
        status: isMemoryHealthy ? ('up' as const) : ('down' as const),
        message: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      },
    };

    let overallStatus: HealthState = 'healthy';
    if (!dbPing.ok) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      service: 'matabai-api',
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.processStartTime) / 1000),
      checks,
    };
  }
}
