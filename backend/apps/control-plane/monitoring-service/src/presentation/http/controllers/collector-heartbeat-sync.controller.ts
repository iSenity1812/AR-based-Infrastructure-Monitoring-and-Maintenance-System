import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { InternalAlertSyncRoute } from '@adapters/inbound/http/decorators/internal-alert-sync-route.decorator';
import { ExternalAlertSyncSecretGuard } from '@adapters/inbound/http/guards/external-alert-sync-secret.guard';
import { SyncCollectorHeartbeatUseCase } from '../../../application/use-cases/sync-collector-heartbeat.use-case';
import { CollectorHeartbeatSyncRequestDto } from '../dto/collector-heartbeat-sync-request.dto';
import {
  CollectorHeartbeatSyncResponseDto,
  CollectorHeartbeatSyncResponseEnvelopeDto,
} from '../dto/collector-heartbeat-sync-response.dto';

@ApiTags('Monitoring Internal')
@Controller('internal/collectors/heartbeat')
export class CollectorHeartbeatSyncController {
  private readonly logger = new Logger(CollectorHeartbeatSyncController.name);

  constructor(
    private readonly syncCollectorHeartbeatUseCase: SyncCollectorHeartbeatUseCase,
  ) {}

  @Post('sync')
  @InternalAlertSyncRoute()
  @UseGuards(ExternalAlertSyncSecretGuard)
  @ApiOperation({
    summary:
      'Receive collector heartbeat observations and sync them into the collector liveness read model.',
  })
  @ApiBody({ type: CollectorHeartbeatSyncRequestDto })
  @ApiOkResponse({ type: CollectorHeartbeatSyncResponseEnvelopeDto })
  async syncCollectorHeartbeat(
    @Body() body: CollectorHeartbeatSyncRequestDto,
  ): Promise<CollectorHeartbeatSyncResponseDto> {
    const result = await this.syncCollectorHeartbeatUseCase.execute(body);

    this.logger.log(
      `collector heartbeat synced (nodeId=${result.nodeId}, lastHeartbeatAt=${result.lastHeartbeatAt})`,
    );

    return result;
  }
}
