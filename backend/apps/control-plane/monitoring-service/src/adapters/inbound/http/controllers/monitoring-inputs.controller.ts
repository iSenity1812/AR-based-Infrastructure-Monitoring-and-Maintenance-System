import { Body, Controller, Post, Req } from '@nestjs/common';
import {
  IngestMonitoringContextRequestDto,
  IngestMonitoringSnapshotRequestDto,
} from '../dto/monitoring-input-request.dto';
import { IngestMonitoringContextUseCase } from '../../../../application/use-cases/commands/ingest-monitoring-context.use-case';
import { IngestMonitoringSnapshotUseCase } from '../../../../application/use-cases/commands/ingest-monitoring-snapshot.use-case';
import { serializeEnvelope } from '../serializers/api-envelope.serializer';
import { responseMeta } from '../serializers/response-meta';
import { MonitoringInputField } from '../../../../domain/entities/monitoring-input.entity';

type HeaderRequest = { headers: Record<string, string | undefined> };

@Controller('monitoring-inputs')
export class MonitoringInputsController {
  constructor(
    private readonly ingestContext: IngestMonitoringContextUseCase,
    private readonly ingestSnapshot: IngestMonitoringSnapshotUseCase,
  ) {}

  @Post('context')
  async ingestContextInput(
    @Body() body: IngestMonitoringContextRequestDto,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.ingestContext.execute({
        ...body,
        identity: this.normalizeFields(body.identity),
        relations: this.normalizeFields(body.relations),
        capacity: this.normalizeFields(body.capacity),
        inventory: this.normalizeFields(body.inventory),
        attributes: this.normalizeFields(body.attributes),
        updatedAt: new Date(body.updatedAt),
      }),
      responseMeta(request),
    );
  }

  @Post('snapshot')
  async ingestSnapshotInput(
    @Body() body: IngestMonitoringSnapshotRequestDto,
    @Req() request: HeaderRequest,
  ) {
    return serializeEnvelope(
      await this.ingestSnapshot.execute({
        ...body,
        metrics: this.normalizeFields(body.metrics) ?? {},
        updatedAt: new Date(body.updatedAt),
      }),
      responseMeta(request),
    );
  }

  private normalizeFields(
    fields?: Record<string, MonitoringInputField>,
  ): Record<string, MonitoringInputField> | undefined {
    if (!fields) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(fields).map(([metricKey, field]) => [
        metricKey,
        {
          ...field,
          metricKey: field.metricKey || metricKey,
          observedAt: new Date(field.observedAt),
        },
      ]),
    );
  }
}
