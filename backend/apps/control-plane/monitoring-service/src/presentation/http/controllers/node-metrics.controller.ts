import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { PERMISSION_CODES } from '@adapters/inbound/http/constants/permission-code.constant';
import { RequirePermissions } from '@adapters/inbound/http/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '@adapters/inbound/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '@adapters/inbound/http/guards/permissions.guard';
import { GetNodeMetricsUseCase } from '../../../application/use-cases/get-node-metrics.use-case';
import {
  MonitoringNodeMetricsResponseDto,
  MonitoringNodeMetricsResponseEnvelopeDto,
} from '../dto/node-metrics-response.dto';

@ApiTags('Monitoring')
@Controller('monitoring/nodes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NodeMetricsController {
  constructor(private readonly getNodeMetricsUseCase: GetNodeMetricsUseCase) {}

  @Get(':nodeId/metrics')
  @RequirePermissions(PERMISSION_CODES.DASHBOARD_READ)
  @ApiParam({
    name: 'nodeId',
    description: 'Stable node identifier from monitoring scope.',
    example: 'node-msi-8bc4df0d',
  })
  @ApiOperation({
    summary: 'Get node metrics bootstrap payload for realtime charts.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Inclusive ISO-8601 lower bound for the seed window.',
    example: '2026-07-18T15:48:00.000Z',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Inclusive ISO-8601 upper bound for the seed window.',
    example: '2026-07-18T16:03:00.000Z',
  })
  @ApiOkResponse({ type: MonitoringNodeMetricsResponseEnvelopeDto })
  async getNodeMetrics(
    @Param('nodeId') nodeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<MonitoringNodeMetricsResponseDto> {
    return this.getNodeMetricsUseCase.execute(
      nodeId,
      { from, to },
    ) as Promise<MonitoringNodeMetricsResponseDto>;
  }
}
