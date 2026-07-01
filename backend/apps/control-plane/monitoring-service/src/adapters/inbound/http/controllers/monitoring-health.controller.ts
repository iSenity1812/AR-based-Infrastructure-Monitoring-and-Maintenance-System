import { Controller, Get, Param, Req } from '@nestjs/common';
import { MonitoringScopeType } from '../../../../domain/constants/monitoring-scope-type.enum';
import { GetHealthOverviewUseCase } from '../../../../application/use-cases/queries/get-health-overview.use-case';
import { GetHealthSummaryUseCase } from '../../../../application/use-cases/queries/get-health-summary.use-case';
import { serializeEnvelope } from '../serializers/api-envelope.serializer';
import { responseMeta } from '../serializers/response-meta';

type HeaderRequest = { headers: Record<string, string | undefined> };

@Controller('monitoring-health')
export class MonitoringHealthController {
  constructor(
    private readonly getHealthSummary: GetHealthSummaryUseCase,
    private readonly getHealthOverview: GetHealthOverviewUseCase,
  ) {}

  @Get('overview/:scopeType')
  async overview(
    @Param('scopeType') scopeType: MonitoringScopeType,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.getHealthOverview.execute(scopeType),
      responseMeta(request),
    );
  }

  @Get(':scopeType/:scopeId')
  async summary(
    @Param('scopeType') scopeType: string,
    @Param('scopeId') scopeId: string,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.getHealthSummary.execute(scopeType, scopeId),
      responseMeta(request),
    );
  }
}
