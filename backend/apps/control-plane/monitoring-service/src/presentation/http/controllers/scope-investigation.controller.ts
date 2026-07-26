import { Controller, Get, Headers, Param, Query, UseGuards } from '@nestjs/common';
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
import { GetScopeInvestigationUseCase } from '../../../application/use-cases/get-scope-investigation.use-case';
import {
  MonitoringScopeInvestigationResponseDto,
  MonitoringScopeInvestigationResponseEnvelopeDto,
} from '../dto/scope-investigation-response.dto';

@ApiTags('Monitoring')
@Controller('monitoring/scopes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ScopeInvestigationController {
  constructor(
    private readonly getScopeInvestigationUseCase: GetScopeInvestigationUseCase,
  ) {}

  @Get(':scopeType/:scopeId/investigation')
  @RequirePermissions(PERMISSION_CODES.DASHBOARD_READ)
  @ApiParam({
    name: 'scopeType',
    enum: ['node', 'rack'],
    description: 'Monitoring scope type for the investigation query.',
  })
  @ApiParam({
    name: 'scopeId',
    description: 'Stable scope identifier from monitoring.',
    example: 'node-msi-341b683e',
  })
  @ApiOperation({
    summary:
      'Get current monitoring context and historical investigation data for one node or rack.',
    description:
      'Use this endpoint to populate the operational investigation view for a monitored node or rack. It returns the current monitoring context, historical metric series for the requested time window, and factual monitoring timeline events that happened within that same window.',
  })
  @ApiQuery({
    name: 'from',
    required: true,
    description: 'Inclusive ISO-8601 lower bound for the investigation window.',
    example: '2026-07-23T04:00:00.000Z',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    description: 'Inclusive ISO-8601 upper bound for the investigation window.',
    example: '2026-07-23T04:30:00.000Z',
  })
  @ApiQuery({
    name: 'interval',
    required: false,
    description:
      'Requested investigation bucket interval. Use `1m` for node detail and `5m` when a coarser rack investigation window is enough.',
    example: '1m',
  })
  @ApiQuery({
    name: 'metricKey',
    required: false,
    description:
      'Optional node metric key for the primary investigation series. This is mainly used by the frontend to focus the chart on the alert metric that triggered or the metric the operator wants to inspect. Rack investigation ignores this field.',
    example: 'cpu_temperature_c_current',
  })
  @ApiOkResponse({
    type: MonitoringScopeInvestigationResponseEnvelopeDto,
    description:
      'Returns scope identity, current monitoring context, historical metric series, and ordered monitoring timeline events for the requested investigation window.',
  })
  async getScopeInvestigation(
    @Param('scopeType') scopeType: 'node' | 'rack',
    @Param('scopeId') scopeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('interval') interval?: string,
    @Query('metricKey') metricKey?: string,
    @Headers('authorization') authorizationHeader?: string,
  ): Promise<MonitoringScopeInvestigationResponseDto> {
    return this.getScopeInvestigationUseCase.execute({
      scopeType,
      scopeId,
      from,
      to,
      interval,
      metricKey,
      authorizationHeader,
    }) as Promise<MonitoringScopeInvestigationResponseDto>;
  }
}
