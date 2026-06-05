import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { GET_HEALTH_USE_CASE } from '../../../infrastructure/di/use-case.tokens';
import { GetHealthUseCase } from '../../../use-cases/queries/get-health.use-case';
import { serializeEnvelope } from '../serializers/api-envelope.serializer';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly getHealthUseCase: GetHealthUseCase;

  constructor(
    @Inject(GET_HEALTH_USE_CASE)
    getHealthUseCase: GetHealthUseCase,
  ) {
    this.getHealthUseCase = getHealthUseCase;
  }

  @Get()
  @ApiOperation({ summary: 'Check service health status.' })
  getHealth() {
    return serializeEnvelope(this.getHealthUseCase.execute());
  }
}
