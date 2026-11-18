import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService } from './health.service';
import { HealthCheckResponse } from '@matabai/shared';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'System health check',
    description: 'Returns overall operational status, component checks, database connectivity, and uptime.',
  })
  @ApiResponse({
    status: 200,
    description: 'System is healthy or degraded',
  })
  async getHealth(): Promise<HealthCheckResponse> {
    return this.healthService.checkHealth();
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Kubernetes/Container liveness probe verifying process responsiveness.',
  })
  @ApiResponse({
    status: 200,
    description: 'Process is alive',
  })
  getLiveness() {
    return this.healthService.checkLiveness();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Kubernetes/Container readiness probe verifying critical dependencies (database and storage).',
  })
  @ApiResponse({
    status: 200,
    description: 'Dependencies healthy, ready to accept traffic',
  })
  @ApiResponse({
    status: 503,
    description: 'Dependencies unavailable, cannot accept traffic',
  })
  async getReadiness(@Res() res: Response) {
    const readiness = await this.healthService.checkReadiness();
    if (readiness.status === 'ready') {
      return res.status(HttpStatus.OK).json(readiness);
    }
    return res.status(HttpStatus.SERVICE_UNAVAILABLE).json(readiness);
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'System operational metrics',
    description: 'Safe memory, heap, and process metrics for telemetry and monitoring.',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics summary',
  })
  getMetrics() {
    return this.healthService.getMetrics();
  }
}
