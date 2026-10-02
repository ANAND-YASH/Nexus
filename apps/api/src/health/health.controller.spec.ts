import { Test, type TestingModule } from '@nestjs/testing';
import type { HealthResponse } from '@nexus/types';
import type { Response } from 'express';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

function readiness(database: 'up' | 'down'): HealthResponse {
  return {
    status: database === 'up' ? 'ok' : 'error',
    service: 'nexus-api',
    version: '0.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: 1,
    checks: { api: { status: 'up' }, database: { status: database } },
  };
}

describe('HealthController', () => {
  let controller: HealthController;
  const health = { readiness: jest.fn(), liveness: jest.fn() };
  const res = { status: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: health }],
    }).compile();

    controller = module.get(HealthController);
  });

  it('responds 200 when every check is up', async () => {
    health.readiness.mockResolvedValue(readiness('up'));

    const result = await controller.check(res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(result.checks.database.status).toBe('up');
  });

  it('responds 503 when the database is down', async () => {
    health.readiness.mockResolvedValue(readiness('down'));

    const result = await controller.check(res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(result.status).toBe('error');
  });

  it('serves liveness from the service', () => {
    health.liveness.mockReturnValue({ status: 'ok' });

    expect(controller.live()).toEqual({ status: 'ok' });
  });
});
