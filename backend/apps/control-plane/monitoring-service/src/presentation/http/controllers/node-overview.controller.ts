import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { PERMISSION_CODES } from '@adapters/inbound/http/constants/permission-code.constant';
import { RequirePermissions } from '@adapters/inbound/http/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '@adapters/inbound/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '@adapters/inbound/http/guards/permissions.guard';
import { GetNodeOverviewUseCase } from '../../../application/use-cases/get-node-overview.use-case';
import {
  MonitoringNodeOverviewResponseDto,
  MonitoringNodeOverviewResponseEnvelopeDto,
} from '../dto/node-overview-response.dto';

@ApiTags('Monitoring')
@Controller('monitoring/nodes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NodeOverviewController {
  constructor(
    private readonly getNodeOverviewUseCase: GetNodeOverviewUseCase,
  ) {}

  @Get(':nodeId/overview')
  @RequirePermissions(PERMISSION_CODES.DASHBOARD_READ)
  @ApiParam({
    name: 'nodeId',
    description: 'Stable node identifier from monitoring scope.',
    example: 'node-msi-5e8ff2c0',
  })
  @ApiOperation({
    summary: 'Get the operator-facing node overview snapshot payload.',
  })
  @ApiOkResponse({ type: MonitoringNodeOverviewResponseEnvelopeDto })
  async getNodeOverview(
    @Param('nodeId') nodeId: string,
  ): Promise<MonitoringNodeOverviewResponseDto> {
    return this.getNodeOverviewUseCase.execute(nodeId) as Promise<MonitoringNodeOverviewResponseDto>;
  }
}
