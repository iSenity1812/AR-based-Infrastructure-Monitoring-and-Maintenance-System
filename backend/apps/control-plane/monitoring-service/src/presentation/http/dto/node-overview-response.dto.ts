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
    description: 'Timestamp of the latest node summary used by the overview.',
    example: '2026-07-10T19:00:18.000Z',
  })
  lastSeenAt!: string;

  @ApiProperty({
    description:
      'Timestamp of the latest hardware fingerprint observed for the node.',
    nullable: true,
    example: '2026-07-17T18:04:34.000Z',
  })
  fingerprintSeenAt!: string | null;
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
    description: 'Timestamp of the latest collector heartbeat observation.',
    nullable: true,
    example: '2026-07-21T08:15:30.000Z',
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

export class NodeOverviewWorstMetricDto {
  @ApiProperty({
    description: 'Metric key currently considered the node-level culprit.',
    nullable: true,
    example: 'node.tcp_retransmit_pct',
  })
  metricKey!: string | null;

  @ApiProperty({
    description: 'Numeric metric value when available.',
    nullable: true,
    example: 19.604,
  })
  metricValueNumeric!: number | null;

  @ApiProperty({
    description: 'Text representation of the culprit metric value.',
    nullable: true,
    example: '19.604',
  })
  metricValueText!: string | null;
}

export class NodeOverviewAlertCountersDto {
  @ApiProperty({
    description: 'Number of critical metrics in the current node snapshot.',
    example: 2,
  })
  criticalMetricCount!: number;

  @ApiProperty({
    description: 'Number of warning metrics in the current node snapshot.',
    example: 4,
  })
  warningMetricCount!: number;

  @ApiProperty({
    description: 'Number of stale metrics in the current node snapshot.',
    example: 0,
  })
  staleMetricCount!: number;
}

export class NodeOverviewTextMetricDto {
  @ApiProperty({ nullable: true, example: 'dormant' })
  value!: string | null;

  @ApiProperty({ nullable: true, example: 'state' })
  unit!: string | null;
}

export class NodeOverviewNumberMetricDto {
  @ApiProperty({ nullable: true, example: 34880 })
  value!: number | null;

  @ApiProperty({ nullable: true, example: 'seconds' })
  unit!: string | null;
}

export class NodeOverviewSummaryMetricsDto {
  @ApiProperty({ type: NodeOverviewTextMetricDto })
  primaryNicStatus!: NodeOverviewTextMetricDto;

  @ApiProperty({ type: NodeOverviewNumberMetricDto })
  uptimeBySeconds!: NodeOverviewNumberMetricDto;

  @ApiProperty({
    type: NodeOverviewWorstMetricDto,
  })
  worstMetric!: NodeOverviewWorstMetricDto;

  @ApiProperty({
    type: NodeOverviewAlertCountersDto,
  })
  alertCounters!: NodeOverviewAlertCountersDto;
}

export class NodeOverviewWorkloadSummaryDto {
  @ApiProperty({ example: 50 })
  total!: number;

  @ApiProperty({ example: 2 })
  unhealthy!: number;

  @ApiProperty({ example: 1 })
  nonRunning!: number;

  @ApiProperty({ example: 5 })
  returned!: number;

  @ApiProperty({
    enum: ['abnormal_first_then_top_cpu'],
    example: 'abnormal_first_then_top_cpu',
  })
  selectionMode!: 'abnormal_first_then_top_cpu';
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
  workloadType!: 'container';

  @ApiProperty({ example: 'backend-shared-vector' })
  name!: string;

  @ApiProperty({ example: 'vector' })
  serviceName!: string;

  @ApiProperty({ example: 'running' })
  status!: string;

  @ApiProperty({ example: 'unhealthy' })
  healthStatus!: string;

  @ApiProperty({ example: 0 })
  restartCount!: number;

  @ApiProperty({ nullable: true, example: 'container.runtime_id' })
  worstMetricKey!: string | null;

  @ApiProperty({ example: true })
  isAbnormal!: boolean;
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
