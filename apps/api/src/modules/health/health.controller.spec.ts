import { Test, TestingModule } from '@nestjs/testing';
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
});
