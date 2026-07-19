import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { ResponseMetaDto } from './health-response.dto';

export class RackOverviewQueryDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Comma-separated severity filters. Accepts labels or numeric codes.',
    example: 'critical,high',
  })
  severity?: string;

  @IsOptional()
  @IsBooleanString()
  @ApiPropertyOptional({
    description: 'Restrict results to racks currently flagged with signal loss.',
    example: false,
  })
  onlySignalLoss?: boolean | string;

  @IsOptional()
  @IsBooleanString()
  @ApiPropertyOptional({
    description:
      'Restrict results to racks currently flagged as rack-level failures.',
    example: false,
  })
  onlyFailure?: boolean | string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Partial match against rackCode or displayName.',
    example: 'LOCAL-LAB',
  })
  search?: string;

  @IsOptional()
  @IsEnum(['severity', 'badNodeRatio', 'updatedAt'])
  @ApiPropertyOptional({
    description: 'Allowlisted sort field.',
    enum: ['severity', 'badNodeRatio', 'updatedAt'],
    example: 'severity',
  })
  sortBy?: 'severity' | 'badNodeRatio' | 'updatedAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  @ApiPropertyOptional({
    description: 'Sort direction.',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    description: '1-based page index.',
    example: 1,
  })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @ApiPropertyOptional({
    description: 'Page size limit.',
    example: 50,
  })
  limit?: number;
}

export class RackOverviewGlobalCountersDto {
  @ApiProperty({ example: 2 })
  totalRacks!: number;

  @ApiProperty({ example: 2 })
  criticalCount!: number;

  @ApiProperty({ example: 0 })
  highCount!: number;

  @ApiProperty({ example: 0 })
  warningCount!: number;

  @ApiProperty({ example: 0 })
  staleCount!: number;

  @ApiProperty({ example: 0 })
  healthyCount!: number;

  @ApiProperty({ example: 0 })
  globalRackLevelFailures!: number;
}

export class RackOverviewRackInfoDto {
  @ApiProperty({ example: '6a5771e5931033f3bd53fb87' })
  id!: string;

  @ApiProperty({ example: 'LOCAL-LAB-01' })
  rackCode!: string;

  @ApiProperty({ example: 'Local Lab 01' })
  displayName!: string;

  @ApiProperty({ nullable: true, example: 'ACTIVE' })
  lifecycleState!: string | null;

  @ApiProperty({ nullable: true, example: 'AVAILABLE' })
  capacityState!: string | null;

  @ApiProperty({ nullable: true, example: 'MY-HOME' })
  siteCode!: string | null;

  @ApiProperty({ nullable: true, example: 'ROOM-01' })
  roomCode!: string | null;

  @ApiProperty({ nullable: true, example: 'ROW-1' })
  rowCode!: string | null;

  @ApiProperty({ nullable: true, example: 'P-1' })
  positionCode!: string | null;

  @ApiProperty({ nullable: true, example: 42 })
  capacityLimit!: number | null;

  @ApiProperty({ nullable: true, example: '' })
  notes!: string | null;

  @ApiProperty({ nullable: true, example: 'DELL' })
  vendor!: string | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { seeded: true },
  })
  metadata!: Record<string, unknown>;

  @ApiProperty({ example: '2026-07-16T11:35:59.000Z' })
  updatedAt!: string;
}

export class RackOverviewHealthStatusDto {
  @ApiProperty({ example: 4 })
  severityCode!: number;

  @ApiProperty({
    enum: ['HEALTHY', 'STALE', 'WARNING', 'HIGH', 'CRITICAL'],
    example: 'CRITICAL',
  })
  severityText!: 'HEALTHY' | 'STALE' | 'WARNING' | 'HIGH' | 'CRITICAL';

  @ApiProperty({ example: false })
  isRackLevelFailure!: boolean;

  @ApiProperty({ example: true })
  hasSignalLoss!: boolean;

  @ApiProperty({ example: true })
  hasOverrideFlag!: boolean;
}

export class RackOverviewBlastRadiusDto {
  @ApiProperty({ example: 2 })
  totalNodes!: number;

  @ApiProperty({ example: 0 })
  badNodes!: number;

  @ApiProperty({ example: 0 })
  criticalNodes!: number;

  @ApiProperty({ example: 0 })
  warningNodes!: number;

  @ApiProperty({ example: 2 })
  staleNodes!: number;

  @ApiProperty({ example: 2 })
  silentDeadNodes!: number;

  @ApiProperty({ example: 0 })
  badNodeRatio!: number;
}

export class RackOverviewAggregateMetricsDto {
  @ApiProperty({ nullable: true, example: null })
  avgCpuUsagePct!: number | null;

  @ApiProperty({ nullable: true, example: null })
  avgMemoryUsedPct!: number | null;

  @ApiProperty({ nullable: true, example: null })
  maxDiskUsedPct!: number | null;

  @ApiProperty({ nullable: true, example: null })
  maxCpuTemperatureC!: number | null;

  @ApiProperty({ nullable: true, example: null })
  sumNetworkRxBytesSec!: number | null;

  @ApiProperty({ nullable: true, example: null })
  sumNetworkTxBytesSec!: number | null;
}

export class RackOverviewCulpritDto {
  @ApiProperty({ example: 'rack.signal.loss' })
  worstNodeId!: string;

  @ApiProperty({ example: 'rack.heartbeat.loss' })
  worstMetricKey!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {},
  })
  worstMetricTags!: Record<string, unknown>;

  @ApiProperty({ nullable: true, example: 0 })
  worstMetricValueNumeric!: number | null;

  @ApiProperty({ nullable: true, example: 'RACK_DISCONNECTED' })
  worstMetricValueText!: string | null;
}

export class RackOverviewTrendDto {
  @ApiProperty({ example: 0 })
  delta1m!: number;

  @ApiProperty({ example: 0 })
  delta5m!: number;

  @ApiProperty({ nullable: true, example: null })
  lastChangeAgeSec!: number | null;
}

export class RackOverviewRackItemDto {
  @ApiProperty({ type: RackOverviewRackInfoDto })
  rackInfo!: RackOverviewRackInfoDto;

  @ApiProperty({ type: RackOverviewHealthStatusDto })
  healthStatus!: RackOverviewHealthStatusDto;

  @ApiProperty({ type: RackOverviewBlastRadiusDto })
  blastRadius!: RackOverviewBlastRadiusDto;

  @ApiProperty({ type: RackOverviewAggregateMetricsDto })
  aggregateMetrics!: RackOverviewAggregateMetricsDto;

  @ApiProperty({ type: RackOverviewCulpritDto })
  culprit!: RackOverviewCulpritDto;

  @ApiProperty({ type: RackOverviewTrendDto })
  trend!: RackOverviewTrendDto;
}

export class RackOverviewActiveFiltersDto {
  @ApiProperty({
    type: [String],
    example: ['critical', 'high', 'warning', 'stale', 'healthy'],
  })
  severity!: string[];

  @ApiProperty({ example: false })
  onlyFailure!: boolean;

  @ApiProperty({ example: false })
  onlySignalLoss!: boolean;

  @ApiProperty({ example: '' })
  search!: string;
}

export class RackOverviewPaginationAndSortDto {
  @ApiProperty({ example: 1 })
  currentPage!: number;

  @ApiProperty({ example: 50 })
  pageSize!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;

  @ApiProperty({ example: 2 })
  totalItems!: number;

  @ApiProperty({
    enum: ['severity', 'badNodeRatio', 'updatedAt'],
    example: 'severity',
  })
  currentSortBy!: 'severity' | 'badNodeRatio' | 'updatedAt';

  @ApiProperty({
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  currentSortOrder!: 'asc' | 'desc';

  @ApiProperty({ type: RackOverviewActiveFiltersDto })
  activeFilters!: RackOverviewActiveFiltersDto;
}

export class MonitoringRackOverviewResponseDto {
  @ApiProperty({ example: '2026-07-19T11:02:54.220Z' })
  generatedAt!: string;

  @ApiProperty({ example: 'rack' })
  scope!: 'rack';

  @ApiProperty({ example: 'operator_dashboard' })
  view!: 'operator_dashboard';

  @ApiProperty({ type: RackOverviewGlobalCountersDto })
  globalCounters!: RackOverviewGlobalCountersDto;

  @ApiProperty({ type: [RackOverviewRackItemDto] })
  racks!: RackOverviewRackItemDto[];

  @ApiProperty({ type: RackOverviewPaginationAndSortDto })
  paginationAndSort!: RackOverviewPaginationAndSortDto;
}

export class MonitoringRackOverviewResponseEnvelopeDto {
  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(MonitoringRackOverviewResponseDto) }],
  })
  data!: MonitoringRackOverviewResponseDto;

  @ApiProperty({ type: ResponseMetaDto })
  meta!: ResponseMetaDto;
}
