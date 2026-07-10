import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

import { ResponseMetaDto } from './health-response.dto';

export class NodeOverviewStatusDto {
  @ApiProperty({
    description: 'Stable node identifier from monitoring scope.',
    example: 'node-msi-5e8ff2c0',
  })
  nodeId!: string;

  @ApiProperty({
    description: 'Operator-facing node health state.',
    enum: ['healthy', 'alerting', 'unknown'],
    example: 'alerting',
  })
  status!: 'healthy' | 'alerting' | 'unknown';

  @ApiProperty({
    description: 'Operator-facing severity level for the node snapshot.',
    enum: ['none', 'low', 'medium', 'high', 'unknown'],
    example: 'high',
  })
  severity!: 'none' | 'low' | 'medium' | 'high' | 'unknown';

  @ApiProperty({
    description: 'Timestamp of the latest node summary used by the overview.',
    example: '2026-07-10T19:00:18.000Z',
  })
  lastSeenAt!: string;

  @ApiProperty({
    description: 'Age in seconds between now and the latest node summary.',
    example: 3,
  })
  freshnessSec!: number;
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

export class NodeOverviewSummaryMetricsDto {
  @ApiProperty({ nullable: true, example: 35.239 })
  cpuUsagePct!: number | null;

  @ApiProperty({ nullable: true, example: 85.107 })
  memoryUsagePct!: number | null;

  @ApiProperty({ nullable: true, example: 85.731 })
  diskUsagePct!: number | null;

  @ApiProperty({ nullable: true, example: 92 })
  cpuTemperatureC!: number | null;

  @ApiProperty({ nullable: true, example: 247041.397 })
  networkRxBytesSec!: number | null;

  @ApiProperty({ nullable: true, example: 7752.464 })
  networkTxBytesSec!: number | null;

  @ApiProperty({ nullable: true, example: 'dormant' })
  primaryNicStatus!: string | null;

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

  @ApiProperty({ example: 3 })
  highCpu!: number;

  @ApiProperty({ example: 4 })
  highMemory!: number;

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

  @ApiProperty({ nullable: true, example: 1.1 })
  cpuUsagePct!: number | null;

  @ApiProperty({ nullable: true, example: 0.62 })
  memoryUsagePct!: number | null;

  @ApiProperty({ example: 0 })
  restartCount!: number;

  @ApiProperty({ example: 17 })
  pidCount!: number;

  @ApiProperty({ nullable: true, example: 'container.runtime_id' })
  worstMetricKey!: string | null;

  @ApiProperty({ example: true })
  isAbnormal!: boolean;
}

export class NodeOverviewRealtimeChannelDto {
  @ApiProperty({
    example: 'monitoring.node.overview.updated',
  })
  channel!: 'monitoring.node.overview.updated';

  @ApiProperty({
    example: 1,
  })
  version!: 1;
}

export class MonitoringNodeOverviewResponseDto {
  @ApiProperty({
    type: NodeOverviewStatusDto,
  })
  node!: NodeOverviewStatusDto;

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
