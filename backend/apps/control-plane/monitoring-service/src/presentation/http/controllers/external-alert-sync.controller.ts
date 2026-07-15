import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { InternalAlertSyncRoute } from '@adapters/inbound/http/decorators/internal-alert-sync-route.decorator';
import { ExternalAlertSyncSecretGuard } from '@adapters/inbound/http/guards/external-alert-sync-secret.guard';
import { mapExternalAlertSyncRequestToCommand } from '../../../application/mappers/external-alert-sync.mapper';
import { SyncExternalAlertsUseCase } from '../../../application/use-cases/sync-external-alerts.use-case';
import { ExternalAlertSyncRequestDto } from '../dto/external-alert-sync-request.dto';
import {
  ExternalAlertSyncResponseDto,
  ExternalAlertSyncResponseEnvelopeDto,
} from '../dto/external-alert-sync-response.dto';

@ApiTags('Monitoring Internal')
@Controller('internal/alerts/external')
export class ExternalAlertSyncController {
  private readonly logger = new Logger(ExternalAlertSyncController.name);

  constructor(
    private readonly syncExternalAlertsUseCase: SyncExternalAlertsUseCase,
  ) {}

  @Post('sync')
  @InternalAlertSyncRoute()
  @UseGuards(ExternalAlertSyncSecretGuard)
  @ApiOperation({
    summary:
      'Receive Alertmanager webhook batches and sync them into the monitoring alert current-state read model.',
  })
  @ApiBody({ type: ExternalAlertSyncRequestDto })
  @ApiOkResponse({ type: ExternalAlertSyncResponseEnvelopeDto })
  async syncExternalAlerts(
    @Body() body: ExternalAlertSyncRequestDto,
  ): Promise<ExternalAlertSyncResponseDto> {
    const receivedAt = new Date().toISOString();
    const command = mapExternalAlertSyncRequestToCommand(body, receivedAt);
    const result = await this.syncExternalAlertsUseCase.execute(command);

    this.logger.log(
      `external alert sync batch processed (totalReceived=${result.totalReceived}, synced=${result.synced}, invalid=${result.invalid}, skipped=${result.skipped})`,
    );

    return {
      totalReceived: result.totalReceived,
      synced: result.synced,
      invalid: result.invalid,
      skipped: result.skipped,
    };
  }
}
