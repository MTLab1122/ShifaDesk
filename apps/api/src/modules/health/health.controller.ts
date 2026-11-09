import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthCheckResponse } from '@matabai/shared';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'System health check',
    description:
      'Returns the overall operational status, component checks, database connectivity, and uptime.',
  })
  @ApiResponse({
    status: 200,
    description: 'System is healthy or degraded',
  })
  async getHealth(): Promise<HealthCheckResponse> {
    return this.healthService.checkHealth();
  }
}
