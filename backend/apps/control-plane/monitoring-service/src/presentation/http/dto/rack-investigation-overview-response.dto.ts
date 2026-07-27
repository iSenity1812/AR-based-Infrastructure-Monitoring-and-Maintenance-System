import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

import { ResponseMetaDto } from './health-response.dto';
import { RackOverviewRackItemDto } from './rack-overview-response.dto';

export class RackInvestigationAlertIncidentDto {
  @ApiProperty({ example: 'incident-01' })
  incidentId!: string;

  @ApiProperty({ example: 'INC-0001' })
  incidentCode!: string;

  @ApiProperty({ example: 'OPEN' })
  status!: string;

  @ApiProperty({ enum: ['HIGH', 'CRITICAL'], example: 'CRITICAL' })
  severity!: 'HIGH' | 'CRITICAL';

  @ApiProperty({ example: 'Rack signal loss' })
  title!: string;

  @ApiProperty({ example: '2026-07-19T11:35:00.000Z' })
  createdAt!: string;

  @ApiProperty({ nullable: true, example: '2026-07-19T11:36:00.000Z' })
  linkedAt!: string | null;
}

export class RackInvestigationActiveAlertDto {
  @ApiProperty({ example: 'rack-a1:signal-loss' })
  fingerprint!: string;

  @ApiProperty({ example: 'RackSignalLoss' })
  alertName!: string;

  @ApiProperty({
    enum: ['node', 'rack', 'workload', 'service'],
    example: 'rack',
  })
  scopeType!: 'node' | 'rack' | 'workload' | 'service';

  @ApiProperty({ nullable: true, example: 'node-a1' })
  nodeId!: string | null;

  @ApiProperty({ nullable: true, example: null })
  workloadId!: string | null;

  @ApiProperty({ enum: ['warning', 'critical'], example: 'critical' })
  severity!: 'warning' | 'critical';

  @ApiProperty({
    enum: [
      'availability',
      'resource',
      'thermal',
      'runtime',
      'network',
      'connectivity',
    ],
    example: 'connectivity',
  })
  category!:
    | 'availability'
    | 'resource'
    | 'thermal'
    | 'runtime'
    | 'network'
    | 'connectivity';

  @ApiProperty({ enum: ['firing', 'resolved'], example: 'firing' })
  status!: 'firing' | 'resolved';

  @ApiProperty({ example: 'Rack is disconnected' })
  summary!: string;

  @ApiProperty({ example: 'No heartbeat was received for the rack.' })
  description!: string;

  @ApiProperty({ nullable: true, example: 'rack.heartbeat.loss' })
  metricKey!: string | null;

  @ApiProperty({ nullable: true, example: '0' })
  currentValue!: string | null;

  @ApiProperty({ nullable: true, example: '1' })
  threshold!: string | null;

  @ApiProperty({ example: '2026-07-19T11:30:00.000Z' })
  startsAt!: string;

  @ApiProperty({ nullable: true, example: null })
  endsAt!: string | null;

  @ApiProperty({ nullable: true, example: '/d/monitoring-overview' })
  dashboardUrl!: string | null;

  @ApiProperty({ nullable: true, example: null })
  runbookUrl!: string | null;

  @ApiProperty({
    enum: ['new', 'acknowledged', 'incident_created', 'suppressed'],
    example: 'new',
  })
  triageStatus!: 'new' | 'acknowledged' | 'incident_created' | 'suppressed';

  @ApiProperty({ type: RackInvestigationAlertIncidentDto, nullable: true })
  incident!: RackInvestigationAlertIncidentDto | null;
}

export class RackInvestigationAlertSummaryDto {
  @ApiProperty({ example: 1 })
  rackAlertCount!: number;

  @ApiProperty({ example: 2 })
  childAlertCount!: number;

  @ApiProperty({ example: 1 })
  criticalCount!: number;

  @ApiProperty({ example: 2 })
  warningCount!: number;
}

export class RackInvestigationAlertsDto {
  @ApiProperty({ type: RackInvestigationAlertSummaryDto })
  summary!: RackInvestigationAlertSummaryDto;

  @ApiProperty({ type: [RackInvestigationActiveAlertDto] })
  rack!: RackInvestigationActiveAlertDto[];

  @ApiProperty({ type: [RackInvestigationActiveAlertDto] })
  child!: RackInvestigationActiveAlertDto[];
}

export class RackOverviewNodeSnapshotCountersDto {
  @ApiProperty({ example: 1 })
  criticalMetricCount!: number;

  @ApiProperty({ example: 2 })
  warningMetricCount!: number;

  @ApiProperty({ example: 0 })
  staleMetricCount!: number;
}

export class RackOverviewNodeSnapshotMetricsDto {
  @ApiProperty({ nullable: true, example: 91.2 })
  cpuUsagePct!: number | null;

  @ApiProperty({ nullable: true, example: 77.4 })
  memoryUsedPct!: number | null;

  @ApiProperty({ nullable: true, example: 61.8 })
  diskUsedPct!: number | null;

  @ApiProperty({ nullable: true, example: 86.1 })
  cpuTemperatureC!: number | null;
}

export class RackOverviewNodeSnapshotWorstMetricDto {
  @ApiProperty({ nullable: true, example: 'cpu_usage_pct' })
  metricKey!: string | null;

  @ApiProperty({ nullable: true, example: 98.4 })
  metricValueNumeric!: number | null;

  @ApiProperty({ nullable: true, example: '98.4' })
  metricValueText!: string | null;
}

export class RackOverviewNodeSnapshotItemDto {
  @ApiProperty({ example: 'node-a1' })
  nodeId!: string;

  @ApiProperty({
    enum: ['healthy', 'alerting', 'unknown'],
    example: 'alerting',
  })
  status!: 'healthy' | 'alerting' | 'unknown';

  @ApiProperty({
    enum: ['healthy', 'stale', 'warning', 'high', 'critical'],
    example: 'critical',
  })
  severity!: 'healthy' | 'stale' | 'warning' | 'high' | 'critical';

  @ApiProperty({ example: '2026-07-19T11:35:59.000Z' })
  lastSeenAt!: string;

  @ApiProperty({ example: 12 })
  freshnessSec!: number;

  @ApiProperty({ enum: ['UNKNOWN'], example: 'UNKNOWN' })
  collectorStatus!: 'UNKNOWN';

  @ApiProperty({ type: RackOverviewNodeSnapshotCountersDto })
  alertCounters!: RackOverviewNodeSnapshotCountersDto;

  @ApiProperty({ type: RackOverviewNodeSnapshotMetricsDto })
  currentMetrics!: RackOverviewNodeSnapshotMetricsDto;

  @ApiProperty({ type: RackOverviewNodeSnapshotWorstMetricDto })
  worstMetric!: RackOverviewNodeSnapshotWorstMetricDto;
}

export class RackOverviewNodeSnapshotDto {
  @ApiProperty({ example: 12 })
  totalNodes!: number;

  @ApiProperty({ example: 5 })
  returned!: number;

  @ApiProperty({
    enum: ['problem_first_then_recent'],
    example: 'problem_first_then_recent',
  })
  selectionMode!: 'problem_first_then_recent';

  @ApiProperty({ type: [RackOverviewNodeSnapshotItemDto] })
  items!: RackOverviewNodeSnapshotItemDto[];
}

export class RackInvestigationNavigationDto {
  @ApiProperty({ example: '/monitoring/racks/rack-a1/nodes' })
  nodesUrl!: string;
}

export class MonitoringRackInvestigationOverviewResponseDto {
  @ApiProperty({ example: '2026-07-19T11:02:54.220Z' })
  generatedAt!: string;

  @ApiProperty({ example: 'rack' })
  scope!: 'rack';

  @ApiProperty({ example: 'rack_investigation_overview' })
  view!: 'rack_investigation_overview';

  @ApiProperty({ type: RackOverviewRackItemDto })
  rack!: RackOverviewRackItemDto;

  @ApiProperty({ type: RackInvestigationAlertsDto })
  alerts!: RackInvestigationAlertsDto;

  @ApiProperty({ type: RackOverviewNodeSnapshotDto })
  nodeSnapshot!: RackOverviewNodeSnapshotDto;

  @ApiProperty({ type: RackInvestigationNavigationDto })
  navigation!: RackInvestigationNavigationDto;
}

export class MonitoringRackInvestigationOverviewResponseEnvelopeDto {
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(MonitoringRackInvestigationOverviewResponseDto) },
    ],
  })
  data!: MonitoringRackInvestigationOverviewResponseDto;

  @ApiProperty({ type: ResponseMetaDto })
  meta!: ResponseMetaDto;
}
