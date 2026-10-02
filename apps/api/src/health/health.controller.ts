import { Controller, Get, Res } from '@nestjs/common';
import type { HealthResponse, LivenessResponse } from '@nexus/types';
import type { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Readiness: 200 when the API and its dependencies are up, else 503. */
  @Get()
  async check(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthResponse> {
    const result = await this.health.readiness();
    res.status(result.status === 'ok' ? 200 : 503);
    return result;
  }

  /** Liveness: the process is up and serving requests. No dependency checks. */
  @Get('live')
  live(): LivenessResponse {
    return this.health.liveness();
  }
}
