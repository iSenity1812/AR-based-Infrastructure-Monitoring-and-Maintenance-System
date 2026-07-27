import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { IncidentStatus } from '@domain/constants/incident-status.enum';

export class ListIncidentsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter incidents by exact incident code.',
    example: 'MON-ALERT-EFA67617732ABE0203ADA182175EB6F1',
  })
  @IsOptional()
  @IsString()
  incidentCode?: string;

  @ApiPropertyOptional({
    description: 'Filter incidents by workflow status.',
    enum: IncidentStatus,
    example: IncidentStatus.OPEN,
  })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;
}
