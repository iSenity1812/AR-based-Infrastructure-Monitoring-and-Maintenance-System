import {
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

import { IncidentStatus } from '@domain/constants/incident-status.enum';
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
import { CreateIncidentRequestDto } from '../dto/create-incident-request.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
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
  async create(@Body() requestDto: CreateIncidentRequestDto) {
    return this.createIncidentUseCase.execute({
      incidentCode: requestDto.incidentCode,
      title: requestDto.title,
      description: requestDto.description,
      severity: requestDto.severity,
      ticketIds: requestDto.ticketIds,
      metadata: requestDto.metadata,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List incidents.' })
  @RequirePermissions(PERMISSION_CODES.INCIDENTS_READ)
  async list(
    @Query('incidentCode') incidentCode?: string,
    @Query('status') status?: IncidentStatus,
  ) {
    return this.listIncidentsUseCase.execute({
      incidentCode,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an incident by id.' })
  @RequirePermissions(PERMISSION_CODES.INCIDENTS_READ)
  async get(@Param('id') incidentId: string) {
    return this.getIncidentUseCase.execute(incidentId);
  }
}
