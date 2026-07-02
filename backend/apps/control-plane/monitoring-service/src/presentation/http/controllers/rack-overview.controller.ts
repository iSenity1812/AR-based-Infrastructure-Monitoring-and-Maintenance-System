import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { PERMISSION_CODES } from '@adapters/inbound/http/constants/permission-code.constant';
import { RequirePermissions } from '@adapters/inbound/http/decorators/require-permissions.decorator';
import { GetRackOverviewUseCase } from '../../../application/use-cases/get-rack-overview.use-case';
import {
  MonitoringRackOverviewResponseDto,
  MonitoringRackOverviewResponseEnvelopeDto,
} from '../dto/rack-overview-response.dto';
import { JwtAuthGuard } from '@adapters/inbound/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '@adapters/inbound/http/guards/permissions.guard';

@ApiTags('Monitoring')
@Controller('monitoring/racks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RackOverviewController {
  constructor(
    private readonly getRackOverviewUseCase: GetRackOverviewUseCase,
  ) {}

  @Get('overview')
  @RequirePermissions(PERMISSION_CODES.DASHBOARD_READ)
  @ApiOperation({
    summary: 'Get the operator-facing rack overview dashboard payload.',
  })
  @ApiOkResponse({ type: MonitoringRackOverviewResponseEnvelopeDto })
  async getRackOverview(): Promise<MonitoringRackOverviewResponseDto> {
    return this.getRackOverviewUseCase.execute();
  }
}
