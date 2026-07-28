import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthCheckDetailDto {
  @ApiProperty({
    description: 'Name of the subsystem that was checked.',
    example: 'mongo',
  })
  name!: string;

  @ApiProperty({
    description: 'Current status for the subsystem.',
    enum: ['ok', 'degraded'],
    example: 'ok',
  })
  status!: 'ok' | 'degraded';

  @ApiPropertyOptional({
    description: 'Additional diagnostic details for the subsystem.',
    type: Object,
  })
  details?: Record<string, unknown>;
}

export class HealthResponseDto {
  @ApiProperty({
    description: 'Service name.',
    example: 'monitoring-service',
  })
  service!: string;

  @ApiProperty({
    description: 'Overall service health.',
    enum: ['ok', 'degraded'],
    example: 'ok',
  })
  status!: 'ok' | 'degraded';

  @ApiProperty({
    description: 'UTC timestamp when the health response was generated.',
    example: '2026-07-01T09:15:00.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Application uptime in seconds.',
    example: 1234.56,
  })
  uptimeSeconds!: number;

  @ApiProperty({
    description: 'Subsystem checks that contribute to the overall status.',
    type: [HealthCheckDetailDto],
  })
  checks!: HealthCheckDetailDto[];
}

export class ResponseMetaDto {
  @ApiPropertyOptional({
    description: 'Request identifier for tracing.',
    example: '4e1d35b3-8d5d-4a42-8e35-3c6f4a2cb8f7',
  })
  requestId?: string;

  @ApiPropertyOptional({
    description: 'Correlation identifier for tracing.',
    example: '4e1d35b3-8d5d-4a42-8e35-3c6f4a2cb8f7',
  })
  correlationId?: string;

  @ApiProperty({
    description: 'Envelope version.',
    example: 'v1',
  })
  version!: 'v1';

  @ApiProperty({
    description: 'UTC timestamp when the response was generated.',
    example: '2026-07-01T09:15:00.000Z',
  })
  timestamp!: string;
}

export class HealthResponseEnvelopeDto {
  @ApiProperty({
    type: HealthResponseDto,
  })
  data!: HealthResponseDto;

  @ApiProperty({
    type: ResponseMetaDto,
  })
  meta!: ResponseMetaDto;
}
