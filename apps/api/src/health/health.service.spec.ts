import { Logger } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { HealthService } from './health.service';

function createService(dataSource: Partial<DataSource>) {
  return new HealthService(dataSource as DataSource);
}

describe('HealthService', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('liveness does not touch the database', () => {
    const query = jest.fn();
    const result = createService({ isInitialized: true, query }).liveness();

    expect(result.status).toBe('ok');
    expect(query).not.toHaveBeenCalled();
  });

  it('reports ok when the database answers', async () => {
    const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const result = await createService({
      isInitialized: true,
      query,
    }).readiness();

    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(result.status).toBe('ok');
    expect(result.checks.api.status).toBe('up');
    expect(result.checks.database.status).toBe('up');
    expect(result.checks.database.latencyMs).toEqual(expect.any(Number));
  });

  it('reports the database down without leaking error details', async () => {
    const query = jest
      .fn()
      .mockRejectedValue(
        new Error('password authentication failed for user "nexus"'),
      );
    const result = await createService({
      isInitialized: true,
      query,
    }).readiness();

    expect(result.status).toBe('error');
    expect(result.checks.api.status).toBe('up');
    expect(result.checks.database).toEqual({ status: 'down' });
    expect(JSON.stringify(result)).not.toMatch(/password|nexus"/);
  });

  it('reports the database down when the data source is not initialized', async () => {
    const query = jest.fn();
    const result = await createService({
      isInitialized: false,
      query,
    }).readiness();

    expect(result.checks.database.status).toBe('down');
    expect(query).not.toHaveBeenCalled();
  });

  it('reports the database down when the probe times out', async () => {
    jest.useFakeTimers();
    const query = jest.fn().mockReturnValue(new Promise(() => undefined));
    const pending = createService({ isInitialized: true, query }).readiness();

    await jest.advanceTimersByTimeAsync(2_000);

    expect((await pending).checks.database.status).toBe('down');
  });
});
