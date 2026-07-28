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
import { GetCollectorLivenessUseCase } from '../../../application/use-cases/get-collector-liveness.use-case';
import {
  CollectorLivenessResponseDto,
  CollectorLivenessResponseEnvelopeDto,
} from '../dto/collector-liveness-response.dto';

@ApiTags('Monitoring')
@Controller('monitoring/nodes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CollectorLivenessController {
  constructor(
    private readonly getCollectorLivenessUseCase: GetCollectorLivenessUseCase,
  ) {}

  @Get(':nodeId/collector-liveness')
  @RequirePermissions(PERMISSION_CODES.DASHBOARD_READ)
  @ApiParam({
    name: 'nodeId',
    description: 'Stable node identifier from monitoring scope.',
    example: 'node-msi-5e8ff2c0',
  })
  @ApiOperation({
    summary: 'Get collector heartbeat liveness for a node.',
  })
  @ApiOkResponse({ type: CollectorLivenessResponseEnvelopeDto })
  async getCollectorLiveness(
    @Param('nodeId') nodeId: string,
  ): Promise<CollectorLivenessResponseDto> {
    return this.getCollectorLivenessUseCase.execute(
      nodeId,
    ) as Promise<CollectorLivenessResponseDto>;
  }
}
