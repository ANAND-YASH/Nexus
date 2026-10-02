import { Test, type TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get(HealthController);
  });

  it('reports an ok status', () => {
    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('nexus-api');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });
});
