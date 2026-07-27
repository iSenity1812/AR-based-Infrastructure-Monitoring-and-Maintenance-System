import { ApiPropertyOptional } from '@nestjs/swagger';

export class InvestigationQueryDto {
  @ApiPropertyOptional({
    description: 'Inclusive ISO-8601 lower bound for the investigation window.',
    example: '2026-07-23T04:00:00.000Z',
  })
  from?: string;

  @ApiPropertyOptional({
    description: 'Inclusive ISO-8601 upper bound for the investigation window.',
    example: '2026-07-23T04:30:00.000Z',
  })
  to?: string;

  @ApiPropertyOptional({
    description: 'Requested bucket interval for rack history and node metric series.',
    enum: ['1m', '5m'],
    example: '1m',
  })
  interval?: string;

  @ApiPropertyOptional({
    description:
      'Optional metric key for node investigation series. If omitted, node metricSeries may be empty.',
    example: 'cpu_temperature_c_current',
  })
  metricKey?: string;
}
