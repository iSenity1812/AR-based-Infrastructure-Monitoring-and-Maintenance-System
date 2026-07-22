import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CollectorHeartbeatSyncRequestDto {
  @ApiProperty({
    description: 'Stable node identifier from monitoring scope.',
    example: 'node-msi-5e8ff2c0',
  })
  @IsString()
  nodeId!: string;

  @ApiProperty({
    description: 'Collector agent identifier.',
    nullable: true,
    example: 'node-msi-5e8ff2c0',
  })
  @IsOptional()
  @IsString()
  agentId!: string | null;

  @ApiProperty({
    description: 'Heartbeat observation timestamp from the collector payload.',
    example: '2026-07-21T08:15:30.000Z',
  })
  @IsDateString()
  observedAt!: string;

  @ApiProperty({
    description: 'Collector source identifier.',
    nullable: true,
    example: 'go-agent-collector',
  })
  @IsOptional()
  @IsString()
  source!: string | null;

  @ApiProperty({
    description: 'Heartbeat metric key.',
    nullable: true,
    example: 'agent.heartbeat',
  })
  @IsOptional()
  @IsString()
  metricKey!: string | null;

  @ApiProperty({
    description: 'Original source metric name.',
    nullable: true,
    example: 'collector.runtime.heartbeat',
  })
  @IsOptional()
  @IsString()
  sourceMetric!: string | null;
}
