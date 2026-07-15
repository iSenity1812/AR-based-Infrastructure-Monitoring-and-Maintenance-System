import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { PERMISSION_CODES } from '@adapters/inbound/http/constants/permission-code.constant';
import { RequirePermissions } from '@adapters/inbound/http/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '@adapters/inbound/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '@adapters/inbound/http/guards/permissions.guard';
import { GetNodeMonitoringStateUseCase } from '../../../application/use-cases/get-node-monitoring-state.use-case';
import {
  MonitoringNodeStateResponseDto,
  MonitoringNodeStateResponseEnvelopeDto,
} from '../dto/node-monitoring-state-response.dto';

@ApiTags('Monitoring')
@Controller('monitoring/nodes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NodeMonitoringStateController {
  constructor(
    private readonly getNodeMonitoringStateUseCase: GetNodeMonitoringStateUseCase,
  ) {}

  @Get('state')
  @RequirePermissions(PERMISSION_CODES.DASHBOARD_READ)
  @ApiOperation({
    summary: 'Get external-alert-backed node monitoring state.',
  })
  @ApiOkResponse({ type: MonitoringNodeStateResponseEnvelopeDto })
  async getNodeMonitoringState(): Promise<MonitoringNodeStateResponseDto> {
    return this.getNodeMonitoringStateUseCase.execute();
  }
}
