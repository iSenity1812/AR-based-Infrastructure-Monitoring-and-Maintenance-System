import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
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
import { CreateIncidentFromAlertUseCase } from '../../../application/use-cases/create-incident-from-alert.use-case';
import { CreateIncidentFromAlertRequestDto } from '../dto/create-incident-from-alert-request.dto';
import {
  CreateIncidentFromAlertResponseDto,
  CreateIncidentFromAlertResponseEnvelopeDto,
} from '../dto/create-incident-from-alert-response.dto';

@ApiTags('Monitoring')
@Controller('monitoring/alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AlertIncidentHandoffController {
  constructor(
    private readonly createIncidentFromAlertUseCase: CreateIncidentFromAlertUseCase,
  ) {}

  @Post(':fingerprint/incident')
  @RequirePermissions(PERMISSION_CODES.INCIDENTS_CREATE)
  @ApiOperation({
    summary: 'Create or link an incident from a firing monitoring alert.',
  })
  @ApiBody({
    type: CreateIncidentFromAlertRequestDto,
    required: false,
  })
  @ApiOkResponse({ type: CreateIncidentFromAlertResponseEnvelopeDto })
  async createIncidentFromAlert(
    @Param('fingerprint') fingerprint: string,
    @Body() input: CreateIncidentFromAlertRequestDto = {},
    @Headers('authorization') authorizationHeader?: string,
    @Headers('x-correlation-id') correlationId?: string,
  ): Promise<CreateIncidentFromAlertResponseDto> {
    return this.createIncidentFromAlertUseCase.execute({
      fingerprint,
      authorizationHeader: authorizationHeader ?? null,
      correlationId: normalizeCorrelationId(correlationId) ?? randomUUID(),
      title: input.title,
      description: input.description,
      operatorNote: input.operatorNote,
      severityOverride: input.severityOverride,
    });
  }
}

function normalizeCorrelationId(input: string | undefined): string | undefined {
  const normalized = input?.trim();
  return normalized ? normalized : undefined;
}
