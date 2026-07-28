import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

import { ResponseMetaDto } from './health-response.dto';

export class CollectorLivenessResponseDto {
  @ApiProperty({
    description: 'Stable node identifier from monitoring scope.',
    example: 'node-msi-5e8ff2c0',
  })
  nodeId!: string;

  @ApiProperty({
    description: 'Collector agent identifier when known.',
    nullable: true,
    example: 'node-msi-5e8ff2c0',
  })
  agentId!: string | null;

  @ApiProperty({
    enum: ['ONLINE', 'OFFLINE', 'UNKNOWN'],
    example: 'ONLINE',
  })
  collectorStatus!: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';

  @ApiProperty({
    nullable: true,
    example: '2026-07-21T08:15:30.000Z',
  })
  lastHeartbeatAt!: string | null;

  @ApiProperty({
    nullable: true,
    example: 12,
  })
  collectorFreshnessSec!: number | null;

  @ApiProperty({
    example: 90,
  })
  heartbeatTimeoutSec!: number;

  @ApiProperty({ nullable: true, example: 'go-agent-collector' })
  source!: string | null;

  @ApiProperty({ nullable: true, example: 'agent.heartbeat' })
  metricKey!: string | null;

  @ApiProperty({
    nullable: true,
    example: 'collector.runtime.heartbeat',
  })
  sourceMetric!: string | null;
}

export class CollectorLivenessResponseEnvelopeDto {
  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(CollectorLivenessResponseDto) }],
  })
  data!: CollectorLivenessResponseDto;

  @ApiProperty({ type: ResponseMetaDto })
  meta!: ResponseMetaDto;
}
