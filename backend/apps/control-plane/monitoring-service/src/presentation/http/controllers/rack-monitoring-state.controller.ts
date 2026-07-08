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
import { GetRackMonitoringStateUseCase } from '../../../application/use-cases/get-rack-monitoring-state.use-case';
import {
  MonitoringRackStateResponseDto,
  MonitoringRackStateResponseEnvelopeDto,
} from '../dto/rack-monitoring-state-response.dto';

@ApiTags('Monitoring')
@Controller('monitoring/racks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RackMonitoringStateController {
  constructor(
    private readonly getRackMonitoringStateUseCase: GetRackMonitoringStateUseCase,
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
}
