import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';

import { ResponseMetaDto } from './health-response.dto';

class ScopeInvestigationScopeDto {
  @ApiProperty({ enum: ['node', 'rack'], example: 'node' })
  scopeType!: 'node' | 'rack';

  @ApiProperty({ example: 'node-msi-341b683e' })
  scopeId!: string;

  @ApiPropertyOptional({ example: 'node-msi-341b683e' })
  nodeId?: string;

  @ApiPropertyOptional({ example: 'node-msi-341b683e' })
  nodeCode?: string;

  @ApiPropertyOptional({ example: 'Maintenance Node 01' })
  displayName?: string;

  @ApiPropertyOptional({ example: '6a5792c1ea8de69105cf48dd' })
  rackId?: string;

  @ApiPropertyOptional({ example: 'LOCAL-LAB-01' })
  rackCode?: string;

  @ApiPropertyOptional({ example: 'Local Lab Rack 01' })
  rackDisplayName?: string;

  @ApiPropertyOptional({ example: 'HCM' })
  siteCode?: string;

  @ApiPropertyOptional({ example: 'LAB' })
  roomCode?: string;
}

class ScopeInvestigationWorstMetricDto {
  @ApiProperty({ example: 'node.heartbeat.loss' })
  metricKey!: string;

  @ApiPropertyOptional({ example: 0 })
  valueNumeric?: number;

  @ApiPropertyOptional({ example: 'PING_TIMEOUT' })
  valueText?: string;
}

class ScopeInvestigationConditionDto {
  @ApiPropertyOptional({ example: 4 })
  healthCode?: number;

  @ApiPropertyOptional({ example: 0 })
  operationalSeverityCode?: number;

  @ApiPropertyOptional({ example: 2 })
  signalSeverityCode?: number;

  @ApiPropertyOptional({ example: true })
  isStale?: boolean;

  @ApiPropertyOptional({ example: '2026-07-23T04:16:44.000Z' })
  lastHeartbeatAt?: string;

  @ApiPropertyOptional({ example: 121 })
  staleAgeSec?: number;

  @ApiPropertyOptional({ example: 120 })
  staleAfterSec?: number;

  @ApiPropertyOptional({ example: 1 })
  policyVersion?: number;

  @ApiPropertyOptional({ example: 3 })
  rackSeverityCode?: number;

  @ApiPropertyOptional({ example: true })
  isRackLevelFailure?: boolean;

  @ApiPropertyOptional({ example: true })
  hasSignalLoss?: boolean;

  @ApiPropertyOptional({ type: ScopeInvestigationWorstMetricDto })
  worstMetric?: ScopeInvestigationWorstMetricDto;
}

class ScopeInvestigationImpactDto {
  @ApiProperty({ example: 1 })
  affectedNodeCount!: number;

  @ApiProperty({ example: 1 })
  totalNodeCount!: number;

  @ApiProperty({ example: 1 })
  affectedRatio!: number;

  @ApiPropertyOptional({ example: 2 })
  criticalNodeCount?: number;

  @ApiPropertyOptional({ example: 2 })
  warningNodeCount?: number;

  @ApiPropertyOptional({ example: 1 })
  staleNodeCount?: number;

  @ApiPropertyOptional({ example: 0 })
  silentDeadNodeCount?: number;
}

class ScopeInvestigationObservedHardwareDto {
  @ApiProperty({ example: '2026-07-23T04:16:45.000Z' })
  observedAt!: string;

  @ApiPropertyOptional({ example: 'Windows 11' })
  osProduct?: string;

  @ApiPropertyOptional({ example: '10.87.18.193' })
  primaryIpv4?: string;

  @ApiPropertyOptional({ example: '50:C2:E8:0B:14:A5' })
  macAddress?: string;

  @ApiPropertyOptional({ example: 16 })
  logicalCpuCount?: number;

  @ApiPropertyOptional({ example: 'x86_64' })
  cpuArchitecture?: string;

  @ApiPropertyOptional({ example: 'AMD Ryzen 7 5800H with Radeon Graphics' })
  cpuModel?: string;

  @ApiPropertyOptional({ example: 'AMD Radeon(TM) Graphics' })
  gpuModelPrimary?: string;

  @ApiPropertyOptional({ example: 'BSS-0123456789' })
  hardwareSerial?: string;

  @ApiPropertyOptional({ example: 'MSI MS-158L' })
  motherboardModel?: string;

  @ApiPropertyOptional({ example: 'KINGSTON SNV2S1000G' })
  ssdModelPrimary?: string;

  @ApiPropertyOptional({ example: 'MS-158L' })
  batteryModel?: string;
}

class ScopeInvestigationCurrentContextDto {
  @ApiPropertyOptional({ example: '2026-07-23T04:16:44.000Z' })
  observedAt?: string;

  @ApiPropertyOptional({ type: ScopeInvestigationConditionDto })
  condition?: ScopeInvestigationConditionDto;

  @ApiPropertyOptional({ type: ScopeInvestigationImpactDto })
  impact?: ScopeInvestigationImpactDto;

  @ApiPropertyOptional({ type: ScopeInvestigationObservedHardwareDto })
  observedHardware?: ScopeInvestigationObservedHardwareDto;
}

class ScopeInvestigationWindowDto {
  @ApiProperty({ example: '2026-07-23T04:00:00.000Z' })
  from!: string;

  @ApiProperty({ example: '2026-07-23T04:30:00.000Z' })
  to!: string;

  @ApiProperty({ enum: ['1m', '5m'], example: '1m' })
  interval!: '1m' | '5m';

  @ApiProperty({ example: 31 })
  pointCount!: number;
}

class ScopeInvestigationMetricPointDto {
  @ApiProperty({ example: '2026-07-23T04:10:00.000Z' })
  timestamp!: string;

  @ApiPropertyOptional({ nullable: true, example: 88.1 })
  valueNumeric?: number | null;

  @ApiPropertyOptional({ nullable: true, example: '88.1' })
  valueText?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 2 })
  severityCode?: number | null;
}

class ScopeInvestigationMetricSeriesDto {
  @ApiProperty({ example: 'cpu_temperature_c_current' })
  metricKey!: string;

  @ApiPropertyOptional({ example: 'CPU Temperature' })
  label?: string;

  @ApiPropertyOptional({ example: 'C' })
  unit?: string;

  @ApiProperty({ type: [ScopeInvestigationMetricPointDto] })
  points!: ScopeInvestigationMetricPointDto[];
}

class ScopeInvestigationTimelineItemDto {
  @ApiProperty({ example: 'placeholder' })
  id!: string;

  @ApiProperty({ example: '2026-07-23T04:18:44.000Z' })
  occurredAt!: string;

  @ApiProperty({ enum: ['monitoring', 'alert', 'incident', 'ticket'] })
  category!: 'monitoring' | 'alert' | 'incident' | 'ticket';

  @ApiProperty({ example: 'placeholder' })
  type!: string;

  @ApiProperty({ example: {} })
  data!: Record<string, unknown>;

  @ApiProperty({ example: 'monitoring-service' })
  source!: string;
}

class ScopeInvestigationSourceRefDto {
  @ApiProperty({ example: 'clickhouse' })
  system!: string;

  @ApiProperty({ example: 'node_current_summary' })
  dataset!: string;

  @ApiPropertyOptional({ example: '2026-07-23T04:16:44.000Z' })
  observedAt?: string;

  @ApiPropertyOptional({ example: 1 })
  policyVersion?: number;
}

export class MonitoringScopeInvestigationResponseDto {
  @ApiProperty({ type: ScopeInvestigationScopeDto })
  scope!: ScopeInvestigationScopeDto;

  @ApiProperty({ type: ScopeInvestigationCurrentContextDto })
  currentContext!: ScopeInvestigationCurrentContextDto;

  @ApiProperty({ type: ScopeInvestigationWindowDto })
  window!: ScopeInvestigationWindowDto;

  @ApiProperty({ type: [ScopeInvestigationMetricSeriesDto] })
  metricSeries!: ScopeInvestigationMetricSeriesDto[];

  @ApiProperty({ type: [ScopeInvestigationTimelineItemDto] })
  monitoringTimeline!: ScopeInvestigationTimelineItemDto[];

  @ApiProperty({ type: [ScopeInvestigationSourceRefDto] })
  sourceRefs!: ScopeInvestigationSourceRefDto[];

  @ApiProperty({ example: '2026-07-23T04:30:00.000Z' })
  generatedAt!: string;
}

export class MonitoringScopeInvestigationResponseEnvelopeDto {
  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(MonitoringScopeInvestigationResponseDto) }],
  })
  data!: MonitoringScopeInvestigationResponseDto;

  @ApiProperty({ type: ResponseMetaDto })
  meta!: ResponseMetaDto;
}
