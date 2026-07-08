import { Body, Controller, Get, Logger, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { PERMISSION_CODES } from '@adapters/inbound/http/constants/permission-code.constant';
import { RequirePermissions } from '@adapters/inbound/http/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '@adapters/inbound/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '@adapters/inbound/http/guards/permissions.guard';
import { GetRackMonitoringStateUseCase } from '../../../application/use-cases/get-rack-monitoring-state.use-case';
import {
  PollRackMonitoringInput,
  PollRackMonitoringUseCase,
} from '../../../application/use-cases/poll-rack-monitoring.use-case';
import {
  formatRackMonitoringPollCompletedMessage,
  formatRackMonitoringPollFailedMessage,
  formatRackMonitoringPollStartMessage,
} from '../../../application/use-cases/rack-monitoring-poll-observability';
import {
  MonitoringRackStateResponseDto,
  MonitoringRackStateResponseEnvelopeDto,
} from '../dto/rack-monitoring-state-response.dto';
import {
  RackMonitoringPollRequestDto,
  RackMonitoringPollResponseDto,
  RackMonitoringPollResponseEnvelopeDto,
} from '../dto/rack-monitoring-poll-response.dto';

@ApiTags('Monitoring')
@Controller('monitoring/racks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RackMonitoringStateController {
  private readonly logger = new Logger(RackMonitoringStateController.name);

  constructor(
    private readonly getRackMonitoringStateUseCase: GetRackMonitoringStateUseCase,
    private readonly pollRackMonitoringUseCase: PollRackMonitoringUseCase,
  ) {}

  @Get('state')
  @RequirePermissions(PERMISSION_CODES.DASHBOARD_READ)
  @ApiOperation({
    summary: 'Get backend-owned rack monitoring state with alert sync metadata.',
  })
  @ApiOkResponse({ type: MonitoringRackStateResponseEnvelopeDto })
  async getRackMonitoringState(): Promise<MonitoringRackStateResponseDto> {
    return this.getRackMonitoringStateUseCase.execute();
  }

  @Post('poll')
  @RequirePermissions(PERMISSION_CODES.DASHBOARD_READ)
  @ApiOperation({
    summary:
      'Manually trigger rack monitoring polling for debugging and real-data verification.',
  })
  @ApiBody({
    type: RackMonitoringPollRequestDto,
    required: false,
  })
  @ApiOkResponse({ type: RackMonitoringPollResponseEnvelopeDto })
  async pollRackMonitoring(
    @Body() input: RackMonitoringPollRequestDto = {},
  ): Promise<RackMonitoringPollResponseDto> {
    const startedAt = Date.now();
    this.logger.log(formatRackMonitoringPollStartMessage('manual', input));

    try {
      const result = await this.pollRackMonitoringUseCase.execute(input);
      this.logger.log(
        formatRackMonitoringPollCompletedMessage(
          'manual',
          Date.now() - startedAt,
          result,
        ),
      );

      return mapPollResultToResponse(result, input);
    } catch (error) {
      this.logger.error(
        formatRackMonitoringPollFailedMessage('manual', input, error),
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}

function mapPollResultToResponse(
  result: Awaited<ReturnType<PollRackMonitoringUseCase['execute']>>,
  input: PollRackMonitoringInput,
): RackMonitoringPollResponseDto {
  const affectedRackIds = Array.from(
    new Set(result.transitions.map((transition) => transition.scopeId)),
  );
  const transitionCounts = {
    activate: 0,
    resolve: 0,
    repeatedActive: 0,
    noop: 0,
  };

  for (const transition of result.transitions) {
    switch (transition.transitionKind) {
      case 'activate':
        transitionCounts.activate += 1;
        break;
      case 'resolve':
        transitionCounts.resolve += 1;
        break;
      case 'repeated_active':
        transitionCounts.repeatedActive += 1;
        break;
      case 'noop':
        transitionCounts.noop += 1;
        break;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    scope: 'rack',
    view: 'monitoring_poll',
    changedSinceSummaryTs: input.changedSinceSummaryTs ?? null,
    processedRows: result.processedRows,
    skippedRows: result.skippedRows,
    transitionCount: result.transitions.length,
    transitionCounts,
    affectedRackIds,
    nextCheckpointSummaryTs: result.nextCheckpointSummaryTs,
  };
}
