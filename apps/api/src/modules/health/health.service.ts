import { Injectable } from '@nestjs/common';
import * as fs from 'node:fs';
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

  checkLiveness(): { status: 'ok'; uptimeSeconds: number; timestamp: string } {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor((Date.now() - this.processStartTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  async checkReadiness(): Promise<{
    status: 'ready' | 'not_ready';
    database: { ok: boolean; latencyMs: number };
    storage: { ok: boolean };
    timestamp: string;
  }> {
    const dbPing = await this.prisma.ping();

    let storageOk = true;
    try {
      const storagePath = process.env.REPORT_STORAGE_PATH || 'uploads/reports';
      if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
      }
    } catch {
      storageOk = false;
    }

    const isReady = dbPing.ok && storageOk;
    return {
      status: isReady ? 'ready' : 'not_ready',
      database: { ok: dbPing.ok, latencyMs: dbPing.latencyMs },
      storage: { ok: storageOk },
      timestamp: new Date().toISOString(),
    };
  }

  getMetrics() {
    const mem = process.memoryUsage();
    return {
      service: 'matabai-api',
      uptimeSeconds: Math.floor((Date.now() - this.processStartTime) / 1000),
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      },
      process: {
        nodeVersion: process.version,
        pid: process.pid,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
