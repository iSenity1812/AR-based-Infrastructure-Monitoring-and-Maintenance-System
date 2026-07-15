import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExternalAlertSyncAlertItemDto {
  @ApiProperty({
    enum: ['firing', 'resolved'],
    example: 'firing',
  })
  @IsString()
  @IsIn(['firing', 'resolved'])
  status!: 'firing' | 'resolved';

  @ApiProperty({
    type: Object,
    additionalProperties: true,
  })
  @IsObject()
  labels!: Record<string, unknown>;

  @ApiProperty({
    type: Object,
    additionalProperties: true,
  })
  @IsObject()
  annotations!: Record<string, unknown>;

  @ApiProperty({
    example: '2026-07-14T13:12:50Z',
  })
  @IsString()
  @IsISO8601()
  startsAt!: string;

  @ApiPropertyOptional({
    example: '2026-07-14T13:14:50Z',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @IsISO8601()
  endsAt?: string | null;

  @ApiPropertyOptional({
    example: 'http://localhost:3010/alerting/grafana/rack_signal_loss_present_v1/view',
  })
  @IsOptional()
  @IsString()
  generatorURL?: string;

  @ApiProperty({
    example: '56b08c98fd42c43a',
  })
  @IsString()
  fingerprint!: string;
}

export class ExternalAlertSyncRequestDto {
  @ApiProperty({
    example: 'monitoring-rack-lab',
  })
  @IsString()
  receiver!: string;

  @ApiProperty({
    enum: ['firing', 'resolved'],
    example: 'resolved',
  })
  @IsString()
  @IsIn(['firing', 'resolved'])
  status!: 'firing' | 'resolved';

  @ApiProperty({
    type: [ExternalAlertSyncAlertItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalAlertSyncAlertItemDto)
  alerts!: ExternalAlertSyncAlertItemDto[];

  @ApiPropertyOptional({
    type: Object,
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  groupLabels?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: Object,
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  commonLabels?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: Object,
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  commonAnnotations?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalURL?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  truncatedAlerts?: number;
}
