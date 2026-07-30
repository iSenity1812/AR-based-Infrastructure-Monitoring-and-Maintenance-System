import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PERMISSION_CODES } from '@domain/constants/permission-code.constant';
import {
  CREATE_INCIDENT_USE_CASE,
  GET_INCIDENT_USE_CASE,
  LIST_INCIDENTS_USE_CASE,
} from '@infrastructure/di/use-case.tokens';
import {
  CreateIncidentUseCase,
  GetIncidentUseCase,
  ListIncidentsUseCase,
} from '@use-cases/commands/incident.commands';
import type { CurrentAuthContextDto } from '@use-cases/dto/current-auth-context.dto';
import { CurrentAuthContext } from '../decorators/current-auth-context.decorator';
import { CreateIncidentRequestDto } from '../dto/create-incident-request.dto';
import { ListIncidentsQueryDto } from '../dto/list-incidents-query.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { IncidentPresenter } from '../presenters/incident.presenter';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermissions } from '../decorators/require-permissions.decorator';

@ApiTags('Incidents')
@ApiBearerAuth()
@Controller('incidents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IncidentsController {
  constructor(
    @Inject(CREATE_INCIDENT_USE_CASE)
    private readonly createIncidentUseCase: CreateIncidentUseCase,
    @Inject(LIST_INCIDENTS_USE_CASE)
    private readonly listIncidentsUseCase: ListIncidentsUseCase,
    @Inject(GET_INCIDENT_USE_CASE)
    private readonly getIncidentUseCase: GetIncidentUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an incident.' })
  @RequirePermissions(PERMISSION_CODES.INCIDENTS_CREATE)
  async create(
    @Body() requestDto: CreateIncidentRequestDto,
    @CurrentAuthContext() authContext: CurrentAuthContextDto,
  ) {
    const incident = await this.createIncidentUseCase.execute({
      incidentCode: requestDto.incidentCode,
      title: requestDto.title,
      description: requestDto.description,
      severity: requestDto.severity,
      ticketIds: requestDto.ticketIds,
      createdBy: {
        userId: authContext.userId,
        username: authContext.username,
        fullName: authContext.fullName,
        source:
          requestDto.metadata?.source === 'monitoring_alert'
            ? 'monitoring_alert_handoff'
            : 'incident_console',
      },
      metadata: requestDto.metadata,
      capturedSnapshot: requestDto.capturedSnapshot
        ? {
            ...requestDto.capturedSnapshot,
            unavailableSources:
              requestDto.capturedSnapshot.unavailableSources ?? [],
            metricEvidence: requestDto.capturedSnapshot.metricEvidence ?? [],
            sourceRefs: requestDto.capturedSnapshot.sourceRefs ?? [],
          }
        : undefined,
    });

    return IncidentPresenter.toResponse(incident);
  }

  @Get()
  @ApiOperation({ summary: 'List incidents.' })
  @RequirePermissions(PERMISSION_CODES.INCIDENTS_READ)
  async list(@Query() query: ListIncidentsQueryDto) {
    this.assertValidScopeQuery(query);

    const incidents = await this.listIncidentsUseCase.execute({
      incidentCode: query.incidentCode,
      status: query.status,
      scopeType: query.scopeType,
      scopeId: query.scopeId,
    });

    return IncidentPresenter.toResponseList(incidents);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an incident by id.' })
  async get(
    @Param('id') incidentId: string,
    @CurrentAuthContext() authContext: CurrentAuthContextDto,
  ) {
    return IncidentPresenter.toDetailResponse(
      await this.getIncidentUseCase.execute(incidentId, {
        userId: authContext.userId,
        permissions: authContext.permissions,
      }),
    );
  }

  private assertValidScopeQuery(query: ListIncidentsQueryDto): void {
    const hasScopeType = Boolean(query.scopeType?.trim());
    const hasScopeId = Boolean(query.scopeId?.trim());

    if (hasScopeType !== hasScopeId) {
      throw new BadRequestException(
        'scopeType and scopeId must be provided together.',
      );
    }
  }
}
