import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

import { ResponseMetaDto } from './health-response.dto';

export class RackMonitoringPollRequestDto {
  @ApiPropertyOptional({
    description:
      'Optional summary timestamp checkpoint. When provided, only rack rows changed since this timestamp are polled.',
    example: '2026-07-08T16:05:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  changedSinceSummaryTs?: string;
}

export class RackMonitoringPollTransitionCountsDto {
  @ApiProperty({
    description: 'Number of activate transitions produced by this poll run.',
    example: 1,
  })
  activate!: number;

  @ApiProperty({
    description: 'Number of resolve transitions produced by this poll run.',
    example: 0,
  })
  resolve!: number;

  @ApiProperty({
    description: 'Number of repeated active transitions produced by this poll run.',
    example: 2,
  })
  repeatedActive!: number;

  @ApiProperty({
    description: 'Number of noop transitions produced by this poll run.',
    example: 4,
  })
  noop!: number;
}

export class RackMonitoringPollResponseDto {
  @ApiProperty({
    description: 'Timestamp when the manual rack poll response was generated.',
    example: '2026-07-08T16:15:00.000Z',
  })
  generatedAt!: string;

  @ApiProperty({
    description: 'Contract scope identifier for this poll response.',
    example: 'rack',
  })
  scope!: 'rack';

  @ApiProperty({
    description: 'Logical view identifier for the manual poll response.',
    example: 'monitoring_poll',
  })
  view!: 'monitoring_poll';

  @ApiProperty({
    description: 'Summary timestamp checkpoint used for this poll run, if any.',
    nullable: true,
    example: '2026-07-08T16:05:00.000Z',
  })
  changedSinceSummaryTs!: string | null;

  @ApiProperty({
    description: 'Number of rack rows evaluated by the poll run.',
    example: 3,
  })
  processedRows!: number;

  @ApiProperty({
    description: 'Number of rack rows skipped because they could not be mapped into monitoring evaluation input.',
    example: 0,
  })
  skippedRows!: number;

  @ApiProperty({
    description: 'Total number of transitions produced by the poll run.',
    example: 3,
  })
  transitionCount!: number;

  @ApiProperty({
    description: 'Transition counts grouped by lifecycle outcome.',
    type: RackMonitoringPollTransitionCountsDto,
  })
  transitionCounts!: RackMonitoringPollTransitionCountsDto;

  @ApiProperty({
    description: 'Rack identifiers touched by this poll run.',
    type: [String],
    example: ['rack-a1', 'rack-b2'],
  })
  affectedRackIds!: string[];

  @ApiProperty({
    description: 'Next summary timestamp checkpoint observed during this poll run.',
    nullable: true,
    example: '2026-07-08T16:15:00.000Z',
  })
  nextCheckpointSummaryTs!: string | null;
}

export class RackMonitoringPollResponseEnvelopeDto {
  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(RackMonitoringPollResponseDto) }],
  })
  data!: RackMonitoringPollResponseDto;

  @ApiProperty({
    type: ResponseMetaDto,
  })
  meta!: ResponseMetaDto;
}
