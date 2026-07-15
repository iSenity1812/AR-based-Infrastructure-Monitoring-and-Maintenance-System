import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

import { ResponseMetaDto } from './health-response.dto';

const NODE_METRIC_KEYS = [
  'cpuUsagePct',
  'memoryUsagePct',
  'diskUsagePct',
  'cpuTemperatureC',
  'networkRxBytesSec',
  'networkTxBytesSec',
] as const;

const WORKLOAD_METRIC_KEYS = ['cpuUsagePct', 'memoryUsagePct'] as const;

const SELECTION_MODES = [
  'top_cpu_then_memory',
  'top_memory_then_cpu',
  'abnormal_first_then_top_cpu',
  'abnormal_only',
  'pinned_workloads',
  'manual_ids',
] as const;

export class NodeMetricsNodeDto {
  @ApiProperty({
    description: 'Stable node identifier from monitoring scope.',
    example: 'node-msi-8bc4df0d',
  })
  nodeId!: string;

  @ApiProperty({
    description: 'Latest node summary timestamp.',
    example: '2026-07-12T09:12:30.000Z',
  })
  lastSeenAt!: string;

  @ApiProperty({
    description: 'Age in seconds between now and the latest node summary.',
    example: 4,
  })
  freshnessSec!: number;
}

export class NodeMetricsConfigDto {
  @ApiProperty({ enum: ['socket.io'], example: 'socket.io' })
  transport!: 'socket.io';

  @ApiProperty({
    enum: ['monitoring.node.metrics.updated'],
    example: 'monitoring.node.metrics.updated',
  })
  channel!: 'monitoring.node.metrics.updated';

  @ApiProperty({ example: 60 })
  bucketSec!: 60;

  @ApiProperty({ example: 900 })
  retentionSec!: 900;

  @ApiProperty({
    enum: NODE_METRIC_KEYS,
    isArray: true,
    example: NODE_METRIC_KEYS,
  })
  nodeMetricKeys!: Array<(typeof NODE_METRIC_KEYS)[number]>;

  @ApiProperty({
    enum: WORKLOAD_METRIC_KEYS,
    isArray: true,
    example: WORKLOAD_METRIC_KEYS,
  })
  workloadMetricKeys!: Array<(typeof WORKLOAD_METRIC_KEYS)[number]>;
}

export class NodeMetricsWorkloadSummaryDto {
  @ApiProperty({ example: 32 })
  total!: number;

  @ApiProperty({ example: 5 })
  returned!: number;

  @ApiProperty({
    enum: SELECTION_MODES,
    example: 'top_cpu_then_memory',
  })
  selectionMode!: (typeof SELECTION_MODES)[number];
}

export class NodeMetricsWorkloadDto {
  @ApiProperty({ example: 'container-api-01' })
  workloadId!: string;

  @ApiProperty({ enum: ['container'], example: 'container' })
  workloadType!: 'container';

  @ApiProperty({ example: 'control-plane-api' })
  name!: string;

  @ApiProperty({ example: 'running' })
  status!: string;

  @ApiProperty({ nullable: true, example: 46.1 })
  latestCpuUsagePct!: number | null;

  @ApiProperty({ nullable: true, example: 38.7 })
  latestMemoryUsagePct!: number | null;
}

export class NodeMetricsNodeValuesDto {
  @ApiProperty({ nullable: true, example: 79.1 })
  cpuUsagePct!: number | null;

  @ApiProperty({ nullable: true, example: 75.2 })
  memoryUsagePct!: number | null;

  @ApiProperty({ nullable: true, example: 71.4 })
  diskUsagePct!: number | null;

  @ApiProperty({ nullable: true, example: 78.8 })
  cpuTemperatureC!: number | null;

  @ApiProperty({ nullable: true, example: 2210000 })
  networkRxBytesSec!: number | null;

  @ApiProperty({ nullable: true, example: 1700000 })
  networkTxBytesSec!: number | null;
}

export class NodeMetricsWorkloadValuesDto {
  @ApiProperty({ example: 'container-api-01' })
  workloadId!: string;

  @ApiProperty({ nullable: true, example: 42.8 })
  cpuUsagePct!: number | null;

  @ApiProperty({ nullable: true, example: 37.9 })
  memoryUsagePct!: number | null;
}

export class NodeMetricsSeedPointDto {
  @ApiProperty({ example: '2026-07-12T09:12:00.000Z' })
  ts!: string;

  @ApiProperty({ type: NodeMetricsNodeValuesDto })
  node!: NodeMetricsNodeValuesDto;

  @ApiProperty({ type: [NodeMetricsWorkloadValuesDto] })
  workloads!: NodeMetricsWorkloadValuesDto[];
}

export class NodeMetricsSeedWindowDto {
  @ApiProperty({
    nullable: true,
    example: '2026-07-12T09:00:00.000Z',
  })
  from!: string | null;

  @ApiProperty({
    nullable: true,
    example: '2026-07-12T09:12:00.000Z',
  })
  to!: string | null;

  @ApiProperty({ type: [NodeMetricsSeedPointDto] })
  points!: NodeMetricsSeedPointDto[];
}

export class MonitoringNodeMetricsResponseDto {
  @ApiProperty({ type: NodeMetricsNodeDto })
  node!: NodeMetricsNodeDto;

  @ApiProperty({ type: NodeMetricsConfigDto })
  metricsConfig!: NodeMetricsConfigDto;

  @ApiProperty({ type: NodeMetricsWorkloadSummaryDto })
  workloadSummary!: NodeMetricsWorkloadSummaryDto;

  @ApiProperty({ type: [NodeMetricsWorkloadDto] })
  workloads!: NodeMetricsWorkloadDto[];

  @ApiProperty({ type: NodeMetricsSeedWindowDto })
  seedWindow!: NodeMetricsSeedWindowDto;
}

export class MonitoringNodeMetricsResponseEnvelopeDto {
  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(MonitoringNodeMetricsResponseDto) }],
  })
  data!: MonitoringNodeMetricsResponseDto;

  @ApiProperty({ type: ResponseMetaDto })
  meta!: ResponseMetaDto;
}
