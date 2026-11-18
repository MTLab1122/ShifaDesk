import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from '../../common/database/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const mockPrismaService = {
      ping: jest.fn().mockResolvedValue({ ok: true, latencyMs: 5 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return system health status', async () => {
    const result = await controller.getHealth();
    expect(result).toBeDefined();
    expect(result.service).toEqual('matabai-api');
    expect(result.status).toEqual('healthy');
    expect(result.checks.database.status).toEqual('up');
  });

  it('should return liveness probe status', () => {
    const result = controller.getLiveness();
    expect(result).toBeDefined();
    expect(result.status).toEqual('ok');
    expect(typeof result.uptimeSeconds).toBe('number');
  });

  it('should return readiness probe status 200 when healthy', async () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    await controller.getReadiness(res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return metrics summary', () => {
    const result = controller.getMetrics();
    expect(result).toBeDefined();
    expect(result.service).toEqual('matabai-api');
    expect(result.memory).toBeDefined();
    expect(typeof result.memory.heapUsedMb).toBe('number');
  });
});
