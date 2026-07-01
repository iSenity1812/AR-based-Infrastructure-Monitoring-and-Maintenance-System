import { Controller, Get, Param, Req } from '@nestjs/common';
import { GetAlertDetailUseCase } from '../../../../application/use-cases/queries/get-alert-detail.use-case';
import { ListOpenAlertsUseCase } from '../../../../application/use-cases/queries/list-open-alerts.use-case';
import { serializeEnvelope } from '../serializers/api-envelope.serializer';
import { responseMeta } from '../serializers/response-meta';

type HeaderRequest = { headers: Record<string, string | undefined> };

@Controller('monitoring-alerts')
export class MonitoringAlertsController {
  constructor(
    private readonly listOpenAlerts: ListOpenAlertsUseCase,
    private readonly getAlertDetail: GetAlertDetailUseCase,
  ) {}

  @Get('open')
  async listOpen(@Req() request: HeaderRequest) {
    return serializeEnvelope(
      await this.listOpenAlerts.execute(),
      responseMeta(request),
    );
  }

  @Get(':id')
  async getDetail(@Param('id') id: string, @Req() request: HeaderRequest) {
    return serializeEnvelope(
      await this.getAlertDetail.execute(id),
      responseMeta(request),
    );
  }
}
