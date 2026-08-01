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

  @ApiPropertyOptional({
    description:
      'Exclude incidents by workflow status. Accepts comma-separated values.',
    example: `${IncidentStatus.CLOSED},${IncidentStatus.RESOLVED}`,
    type: String,
  })
  @IsOptional()
  @IsString()
  excludeStatus?: string;

  @ApiPropertyOptional({
    description:
      'Filter incidents by affected scope type. Use together with scopeId.',
    example: 'rack',
  })
  @IsOptional()
  @IsString()
  scopeType?: string;

  @ApiPropertyOptional({
    description:
      'Filter incidents by affected scope id. Use together with scopeType.',
    example: '6a5792c1ea8de69105cf48dd',
  })
  @IsOptional()
  @IsString()
  scopeId?: string;
}
