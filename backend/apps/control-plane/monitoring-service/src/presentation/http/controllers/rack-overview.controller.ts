import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { PERMISSION_CODES } from '@adapters/inbound/http/constants/permission-code.constant';
import { RequirePermissions } from '@adapters/inbound/http/decorators/require-permissions.decorator';
import { GetRackOverviewUseCase } from '../../../application/use-cases/get-rack-overview.use-case';
import {
  RackOverviewQueryDto,
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
  @ApiQuery({
    name: 'severity',
    required: false,
    description:
      'Comma-separated severity filters. Accepts labels or numeric codes.',
    example: 'critical,high',
  })
  @ApiQuery({
    name: 'onlySignalLoss',
    required: false,
    description: 'Restrict results to signal-loss racks only.',
    example: false,
  })
  @ApiQuery({
    name: 'onlyFailure',
    required: false,
    description: 'Restrict results to rack-level failures only.',
    example: false,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Partial match against rackCode or displayName.',
    example: 'LOCAL-LAB',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['severity', 'badNodeRatio', 'updatedAt'],
    example: 'severity',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 50,
  })
  @ApiOkResponse({ type: MonitoringRackOverviewResponseEnvelopeDto })
  async getRackOverview(
    @Query() query: RackOverviewQueryDto,
  ): Promise<MonitoringRackOverviewResponseDto> {
    return this.getRackOverviewUseCase.execute(query);
  }
}
