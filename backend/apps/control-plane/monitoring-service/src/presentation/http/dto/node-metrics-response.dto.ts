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

export class NodeMetricsConfigDto {
  @ApiProperty({ enum: ['socket.io'], example: 'socket.io' })
  transport!: 'socket.io';

  @ApiProperty({
    example: 'monitoring.node.node-msi-341b683e.metrics.updated',
  })
  channel!: string;

  @ApiProperty({ example: 60 })
  bucketSec!: number;

  @ApiProperty({ example: 900 })
  retentionSec!: number;

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

export class NodeMetricsUnitsDto {
  @ApiProperty({ example: '%' })
  cpuUsagePct!: '%';

  @ApiProperty({ example: '%' })
  memoryUsagePct!: '%';

  @ApiProperty({ example: '%' })
  diskUsagePct!: '%';

  @ApiProperty({ example: 'C' })
  cpuTemperatureC!: 'C';

  @ApiProperty({ example: 'bytes/sec' })
  networkRxBytesSec!: 'bytes/sec';

  @ApiProperty({ example: 'bytes/sec' })
  networkTxBytesSec!: 'bytes/sec';

  @ApiProperty({ example: '%' })
  workloadCpuUsagePct!: '%';

  @ApiProperty({ example: '%' })
  workloadMemoryUsagePct!: '%';
}

export class NodeMetricsMetaDto {
  @ApiProperty({ type: NodeMetricsUnitsDto })
  units!: NodeMetricsUnitsDto;
}

export class NodeMetricsWorkloadDto {
  @ApiProperty({ example: 'container-api-01' })
  workloadId!: string;

  @ApiProperty({ enum: ['container'], example: 'container' })
  workloadType!: 'container';

  @ApiProperty({ example: 'control-plane-api' })
  name!: string;
}

export class NodeMetricsSeriesDto {
  @ApiProperty({ type: [Number], nullable: true, example: [79.1, 81.4, null] })
  cpuUsagePct!: Array<number | null>;

  @ApiProperty({ type: [Number], nullable: true, example: [75.2, 75.1, null] })
  memoryUsagePct!: Array<number | null>;

  @ApiProperty({ type: [Number], nullable: true, example: [71.4, 71.4, null] })
  diskUsagePct!: Array<number | null>;

  @ApiProperty({ type: [Number], nullable: true, example: [78.8, 79.4, null] })
  cpuTemperatureC!: Array<number | null>;

  @ApiProperty({
    type: [Number],
    nullable: true,
    example: [2210000, 2200000, null],
  })
  networkRxBytesSec!: Array<number | null>;

  @ApiProperty({
    type: [Number],
    nullable: true,
    example: [1700000, 1680000, null],
  })
  networkTxBytesSec!: Array<number | null>;
}

export class NodeMetricsWorkloadSeriesDto {
  @ApiProperty({ type: [Number], nullable: true, example: [42.8, 40.5, null] })
  cpuUsagePct!: Array<number | null>;

  @ApiProperty({ type: [Number], nullable: true, example: [37.9, 37.4, null] })
  memoryUsagePct!: Array<number | null>;
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

  @ApiProperty({ example: 60 })
  resolutionSec!: number;

  @ApiProperty({
    type: [String],
    example: [
      '2026-07-12T09:10:00.000Z',
      '2026-07-12T09:11:00.000Z',
      '2026-07-12T09:12:00.000Z',
    ],
  })
  timestamps!: string[];

  @ApiProperty({ type: NodeMetricsSeriesDto })
  nodeMetrics!: NodeMetricsSeriesDto;

  @ApiProperty({
    additionalProperties: {
      $ref: getSchemaPath(NodeMetricsWorkloadSeriesDto),
    },
    example: {
      'container-api-01': {
        cpuUsagePct: [42.8, 40.5, null],
        memoryUsagePct: [37.9, 37.4, null],
      },
    },
  })
  workloadMetrics!: Record<string, NodeMetricsWorkloadSeriesDto>;
}

export class MonitoringNodeMetricsResponseDto {
  @ApiProperty({
    description: 'Stable node identifier from monitoring scope.',
    example: 'node-msi-8bc4df0d',
  })
  nodeId!: string;

  @ApiProperty({ type: NodeMetricsConfigDto })
  metricsConfig!: NodeMetricsConfigDto;

  @ApiProperty({ type: NodeMetricsMetaDto })
  meta!: NodeMetricsMetaDto;

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
