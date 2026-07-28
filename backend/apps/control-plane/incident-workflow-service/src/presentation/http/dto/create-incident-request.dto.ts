import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { IncidentSeverity } from '@domain/constants/incident-severity.enum';

class IncidentCapturedSnapshotWindowDto {
  @ApiProperty()
  @IsDateString()
  from!: string;

  @ApiProperty()
  @IsDateString()
  to!: string;

  @ApiProperty({ enum: ['1m'] })
  @IsIn(['1m'])
  interval!: '1m';
}

class IncidentCapturedSnapshotUnavailableSourceDto {
  @ApiProperty()
  @IsString()
  source!: string;

  @ApiProperty()
  @IsString()
  reasonCode!: string;
}

class IncidentCapturedSnapshotScopeDto {
  @ApiProperty()
  @IsString()
  scopeType!: string;

  @ApiProperty()
  @IsString()
  scopeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rackId?: string;
}

class IncidentCapturedSnapshotDto {
  @ApiProperty({ enum: ['incident.context.v1'] })
  @IsIn(['incident.context.v1'])
  schemaVersion!: 'incident.context.v1';

  @ApiProperty()
  @IsDateString()
  capturedAt!: string;

  @ApiProperty({ type: IncidentCapturedSnapshotWindowDto })
  @ValidateNested()
  @Type(() => IncidentCapturedSnapshotWindowDto)
  window!: IncidentCapturedSnapshotWindowDto;

  @ApiProperty({ enum: ['complete', 'partial', 'minimal'] })
  @IsIn(['complete', 'partial', 'minimal'])
  completeness!: 'complete' | 'partial' | 'minimal';

  @ApiPropertyOptional({
    type: [IncidentCapturedSnapshotUnavailableSourceDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IncidentCapturedSnapshotUnavailableSourceDto)
  unavailableSources?: IncidentCapturedSnapshotUnavailableSourceDto[];

  @ApiProperty({ type: Object })
  @IsObject()
  alert!: Record<string, unknown>;

  @ApiProperty({ type: IncidentCapturedSnapshotScopeDto })
  @ValidateNested()
  @Type(() => IncidentCapturedSnapshotScopeDto)
  scope!: IncidentCapturedSnapshotScopeDto;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  asset?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  observedHardware?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  condition?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  impact?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  metricEvidence?: Record<string, unknown>[];

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  sourceRefs?: Record<string, unknown>[];
}

export class CreateIncidentRequestDto {
  @ApiProperty()
  @IsString()
  incidentCode!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: IncidentSeverity })
  @IsEnum(IncidentSeverity)
  severity!: IncidentSeverity;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ticketIds?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ type: IncidentCapturedSnapshotDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IncidentCapturedSnapshotDto)
  capturedSnapshot?: IncidentCapturedSnapshotDto;
}
