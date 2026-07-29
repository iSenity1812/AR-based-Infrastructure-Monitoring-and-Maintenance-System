import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

import { ResponseMetaDto } from './health-response.dto';

export class NodeOverviewStatusDto {
  @ApiProperty({
    description: 'Stable node identifier from monitoring scope.',
    example: 'node-msi-5e8ff2c0',
  })
  nodeId!: string;

  @ApiProperty({
    description: 'Canonical operator-facing node health state.',
    enum: ['healthy', 'warning', 'critical', 'unknown'],
    example: 'critical',
  })
  status!: 'healthy' | 'warning' | 'critical' | 'unknown';

  @ApiProperty({
    description:
      'Stable reason explaining why the node health status was chosen.',
    enum: [
      'none',
      'warning_metric',
      'critical_metric',
      'telemetry_stale',
      'no_telemetry',
    ],
    example: 'critical_metric',
  })
  reason!:
    | 'none'
    | 'warning_metric'
    | 'critical_metric'
    | 'telemetry_stale'
    | 'no_telemetry';

  @ApiProperty({
    description:
      'Operator-local timestamp of the latest node summary used by the overview.',
    example: '2026-07-10T19:00:18.000+07:00',
  })
  lastSeenAt!: string;
}

export class NodeOverviewCollectorDto {
  @ApiProperty({
    description:
      'Collector heartbeat liveness derived from the latest heartbeat observation.',
    enum: ['online', 'offline', 'unknown'],
    example: 'online',
  })
  status!: 'online' | 'offline' | 'unknown';

  @ApiProperty({
    description:
      'Stable reason explaining why the collector liveness status was chosen.',
    enum: ['none', 'heartbeat_timeout', 'no_heartbeat'],
    example: 'heartbeat_timeout',
  })
  reason!: 'none' | 'heartbeat_timeout' | 'no_heartbeat';

  @ApiProperty({
    description:
      'Operator-local timestamp of the latest collector heartbeat observation.',
    nullable: true,
    example: '2026-07-21T15:15:30.000+07:00',
  })
  lastHeartbeatAt!: string | null;

  @ApiProperty({
    description:
      'Timeout window in seconds before the collector is considered offline.',
    example: 90,
  })
  heartbeatTimeoutSec!: number;
}

export class NodeOverviewHardwareDto {
  @ApiProperty({ nullable: true, example: 'MS-158L' })
  batteryModel!: string | null;

  @ApiProperty({ nullable: true, example: '386' })
  cpuArchitecture!: string | null;

  @ApiProperty({
    nullable: true,
    example: 'AMD Ryzen 7 5800H with Radeon Graphics',
  })
  cpuModel!: string | null;

  @ApiProperty({ nullable: true, example: 'AMD Radeon(TM) Graphics' })
  gpuModelPrimary!: string | null;

  @ApiProperty({ nullable: true, example: 'BSS-0123456789' })
  hardwareSerial!: string | null;

  @ApiProperty({ nullable: true, example: 16 })
  logicalCpuCount!: number | null;

  @ApiProperty({ nullable: true, example: '50:C2:E8:0B:14:A5' })
  macAddress!: string | null;

  @ApiProperty({ nullable: true, example: 'MSI MS-158L' })
  motherboardModel!: string | null;

  @ApiProperty({ nullable: true, example: 'Windows 11' })
  osProduct!: string | null;

  @ApiProperty({ nullable: true, example: '192.168.1.2' })
  primaryIpv4!: string | null;

  @ApiProperty({ nullable: true, example: 'KINGSTON SNV2S1000G' })
  ssdModelPrimary!: string | null;
}

export class NodeOverviewNodeDto extends NodeOverviewStatusDto {
  @ApiProperty({ type: NodeOverviewHardwareDto })
  hardware!: NodeOverviewHardwareDto;

  @ApiProperty({ type: NodeOverviewCollectorDto })
  collector!: NodeOverviewCollectorDto;
}

export class NodeOverviewPrimaryIssueDto {
  @ApiProperty({
    description: 'Stable category for the primary node issue.',
    enum: ['none', 'heartbeat_loss', 'metric_alert'],
    example: 'heartbeat_loss',
  })
  type!: 'none' | 'heartbeat_loss' | 'metric_alert';

  @ApiProperty({
    description:
      'Metric key currently considered the node-level primary issue.',
    nullable: true,
    example: 'node.heartbeat.loss',
  })
  metricKey!: string | null;

  @ApiProperty({
    description: 'Observed value for the primary issue when available.',
    nullable: true,
    oneOf: [{ type: 'number' }, { type: 'string' }],
    example: 'PING_TIMEOUT',
  })
  value!: number | string | null;
}

export class NodeOverviewAlertCountersDto {
  @ApiProperty({
    description: 'Number of critical metrics in the current node snapshot.',
    example: 2,
  })
  critical!: number;

  @ApiProperty({
    description: 'Number of warning metrics in the current node snapshot.',
    example: 4,
  })
  warning!: number;

  @ApiProperty({
    description: 'Number of stale metrics in the current node snapshot.',
    example: 0,
  })
  stale!: number;
}

export class NodeOverviewSummaryMetricsDto {
  @ApiProperty({ nullable: true, example: 'dormant' })
  primaryNicStatus!: string | null;

  @ApiProperty({ nullable: true, example: 34880 })
  uptimeSec!: number | null;

  @ApiProperty({
    type: NodeOverviewPrimaryIssueDto,
  })
  primaryIssue!: NodeOverviewPrimaryIssueDto;

  @ApiProperty({
    type: NodeOverviewAlertCountersDto,
  })
  alertCounters!: NodeOverviewAlertCountersDto;
}

export class NodeOverviewWorkloadSummaryDto {
  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ example: 48 })
  healthy!: number;

  @ApiProperty({ example: 2 })
  unhealthy!: number;
}

export class NodeOverviewWorkloadPrimaryIssueDto {
  @ApiProperty({
    description: 'Stable category for the primary workload issue.',
    enum: ['none', 'heartbeat_loss', 'metric_alert'],
    example: 'heartbeat_loss',
  })
  type!: 'none' | 'heartbeat_loss' | 'metric_alert';

  @ApiProperty({
    description:
      'Metric key currently considered the workload-level primary issue.',
    nullable: true,
    example: 'container.heartbeat.loss',
  })
  metricKey!: string | null;
}

export class NodeOverviewWorkloadDto {
  @ApiProperty({
    example: 'db8559e332ec64dfa558917710d5afb621c0a7ea8b5f91193c5c288ba28d663d',
  })
  workloadId!: string;

  @ApiProperty({
    enum: ['container'],
    example: 'container',
  })
  type!: 'container';

  @ApiProperty({ example: 'backend-shared-vector' })
  name!: string;

  @ApiProperty({
    description: 'Runtime lifecycle state for the workload.',
    enum: ['running', 'stopped', 'unknown'],
    example: 'running',
  })
  status!: 'running' | 'stopped' | 'unknown';

  @ApiProperty({
    description: 'Health probe or application health state for the workload.',
    enum: ['healthy', 'unhealthy', 'unknown'],
    example: 'unhealthy',
  })
  healthStatus!: 'healthy' | 'unhealthy' | 'unknown';

  @ApiProperty({ example: 0 })
  restartCount!: number;

  @ApiProperty({ type: NodeOverviewWorkloadPrimaryIssueDto })
  primaryIssue!: NodeOverviewWorkloadPrimaryIssueDto;
}

export class NodeOverviewRealtimeChannelDto {
  @ApiProperty({
    enum: ['socket.io'],
    example: 'socket.io',
  })
  transport!: 'socket.io';

  @ApiProperty({
    example: 'monitoring.node.node-msi-341b683e.overview.changed',
  })
  channel!: string;
}

export class MonitoringNodeOverviewResponseDto {
  @ApiProperty({
    type: NodeOverviewNodeDto,
  })
  node!: NodeOverviewNodeDto;

  @ApiProperty({
    type: NodeOverviewSummaryMetricsDto,
  })
  summaryMetrics!: NodeOverviewSummaryMetricsDto;

  @ApiProperty({
    type: NodeOverviewWorkloadSummaryDto,
  })
  workloadSummary!: NodeOverviewWorkloadSummaryDto;

  @ApiProperty({
    type: [NodeOverviewWorkloadDto],
  })
  workloads!: NodeOverviewWorkloadDto[];

  @ApiProperty({
    type: NodeOverviewRealtimeChannelDto,
  })
  realtime!: NodeOverviewRealtimeChannelDto;
}

export class MonitoringNodeOverviewResponseEnvelopeDto {
  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(MonitoringNodeOverviewResponseDto) }],
  })
  data!: MonitoringNodeOverviewResponseDto;

  @ApiProperty({
    type: ResponseMetaDto,
  })
  meta!: ResponseMetaDto;
}
