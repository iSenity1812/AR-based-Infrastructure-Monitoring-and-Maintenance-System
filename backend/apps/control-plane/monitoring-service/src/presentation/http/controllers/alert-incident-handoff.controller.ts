import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { PERMISSION_CODES } from '@adapters/inbound/http/constants/permission-code.constant';
import { CurrentAuthContext } from '@adapters/inbound/http/decorators/current-auth-context.decorator';
import { RequirePermissions } from '@adapters/inbound/http/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '@adapters/inbound/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '@adapters/inbound/http/guards/permissions.guard';
import type { CurrentAuthContextDto } from '../../../application/use-cases/dto/current-auth-context.dto';
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
    @CurrentAuthContext() authContext?: CurrentAuthContextDto,
    @Req() request?: Request,
  ): Promise<CreateIncidentFromAlertResponseDto> {
    return this.createIncidentFromAlertUseCase.execute({
      fingerprint,
      authorizationHeader: authorizationHeader ?? null,
      correlationId: getCorrelationId(request),
      actor: authContext
        ? {
            userId: authContext.userId,
            username: authContext.username,
            sessionId: authContext.sessionId,
            fullName: authContext.fullName,
          }
        : undefined,
      title: input.title,
      description: input.description,
      operatorNote: input.operatorNote,
      severityOverride: input.severityOverride,
    });
  }
}

function getCorrelationId(request: Request | undefined): string | undefined {
  const correlationId = request?.headers['x-correlation-id'];

  if (Array.isArray(correlationId)) {
    return normalizeCorrelationId(correlationId[0]);
  }

  return normalizeCorrelationId(correlationId);
}

function normalizeCorrelationId(input: string | undefined): string | undefined {
  const normalized = input?.trim();
  return normalized ? normalized : undefined;
}
