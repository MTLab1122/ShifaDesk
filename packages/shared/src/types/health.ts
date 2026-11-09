export type HealthState = 'healthy' | 'degraded' | 'unhealthy';

export interface ComponentHealth {
  status: 'up' | 'down';
  latencyMs?: number;
  message?: string;
}

export interface HealthCheckResponse {
  status: HealthState;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    database: ComponentHealth;
    memory?: ComponentHealth;
    storage?: ComponentHealth;
  };
}
