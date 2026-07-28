import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { GET_HEALTH_USE_CASE } from '@infrastructure/di/use-case.tokens';
import { GetHealthUseCase } from '@use-cases/queries/get-health.use-case';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(GET_HEALTH_USE_CASE)
    private readonly getHealthUseCase: GetHealthUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get AR BFF service health.' })
  async getHealth() {
    return this.getHealthUseCase.execute();
  }
}
